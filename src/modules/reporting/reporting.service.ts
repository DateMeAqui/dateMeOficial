import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppraiserEnum } from '../complaints/enum/appraiser.enum';


@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private prisma: PrismaService) { }

  async processReport(complaintPayload: any) {
    // this.logger.log(`Processando denúncia para o post ID: ${complaintPayload.postId}`)

    const complaint = await this.prisma.complaint.findUnique({
      where: {
        id: complaintPayload.complaintId
      }
    });

    if (!complaint) {
      this.logger.warn(`Denúncia com ID ${complaintPayload.complaintId} não encontrada.`);
      return;
    }

    await this.prisma.complaint.update({
      where: {
        id: complaintPayload.complaintId
      },
      data: {
        appraiser: AppraiserEnum.ASSISTANT,
        status: complaintPayload.agent.acao_recommended,
        analysesComplaints: complaintPayload.agent,
      }
    })

  }

}
