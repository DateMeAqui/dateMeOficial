import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcpService } from '../gcp/gcp.service';
import { PubSub, Topic } from '@google-cloud/pubsub'
import { PUBSUB_CLIENT } from '../gcp/gcp.module';
import { CreateComplaintInput } from './dto/create-complaint.input';

@Injectable()
export class ComplaintsService {
  private readonly REPORTING_TOPIC_NAME = 'date-me-topic-reporting-reported-posts-queue';
  private readonly logger = new Logger(GcpService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(PUBSUB_CLIENT) private pubSubClient: PubSub
  ){}

  async createComplaint(complaint: CreateComplaintInput, reporterId: string) {
    let reportedUserId: string;
    let reportedContent: string;

    // Se for denúncia de post
    if (complaint?.postId) {
      const postExists = await this.prisma.post.findUnique({
        where: { id: complaint.postId }
      });

      if (!postExists) {
        throw new Error('Post não encontrado');
      }
      reportedUserId = postExists.authorId;
      reportedContent = postExists.content;
    }
    else if (complaint.commentId) {
      const commentExists = await this.prisma.comment.findUnique({
        where: { id: complaint.commentId }
      });

      if (!commentExists) {
        throw new Error('Comentário não encontrado');
      }
      reportedUserId = commentExists.authorId;
      reportedContent = commentExists.content;
    } else {
      throw new Error('É necessário informar postId ou commentId');
    }

    this.logger.log(`Nova denúncia: ${complaint.reason} (reporter: ${reporterId})`);

    const data = {
        reason: complaint.reason,
        description: complaint.description,
        reporterId: reporterId,
        reportedUserId: reportedUserId,
        status: 'PENDING'
      }

      data['createdAt'] = new Date();
      if (complaint.postId){
        data['postId'] = complaint.postId
      }
      else {
        data['commentId'] = complaint.commentId
      }

    // Criar denúncia no banco
    const complaintCreated = await this.prisma.complaint.create({
      data
    })

    const reportPostToQueue = {
      complaintId: complaintCreated.id,
      reason: complaint.reason,
      description: complaint.description,
      reportedUserId: reportedUserId,
      createdAt: complaintCreated.createdAt
    };

    if (complaint.postId){
      reportPostToQueue['postId'] = complaint.postId;
    } else {
      reportPostToQueue['commentId'] = complaint.commentId;
    }
    reportPostToQueue['reportedContent'] = reportedContent;

    // Publicar no Pub/Sub
    const dataBuffer = Buffer.from(JSON.stringify(reportPostToQueue));
    try {
      this.logger.log(`Publicando denúncia no tópico: ${this.REPORTING_TOPIC_NAME}`);
      const topic: Topic = this.pubSubClient.topic(this.REPORTING_TOPIC_NAME);
      const msgId = await topic.publishMessage({data: dataBuffer});
      this.logger.log(`Mensagem ${msgId} publicada com sucesso no Pub/Sub`);
    } catch (error) {
      this.logger.warn(`Falha ao publicar no Pub/Sub: ${error.message}`);
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('Não foi possível processar a denúncia.');
      }
    }
    
    return 'Denúncia criada com sucesso';
  }


}
