import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from "@nestjs/common";
import { ReportingService } from "./reporting.service";
import { Public } from "../auth/guards/public.decorator";


interface PubSubMessage {
  message: {
    data: string;
    messageId: string;
    attributes: {
      [key: string]: string
    };
  };
  subscription: string;
}

@Public()
@Controller('v1')
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(private readonly reportingService: ReportingService) { }

  @Post('reporting-reported-posts-resolved')
  @HttpCode(HttpStatus.OK)
  async handleReportedPost(@Body() body: PubSubMessage) {
    try {
      this.logger.log(`Mensagem recebida da inscrição: ${body.subscription || 'N/A'}`);

      if (!body.message) {
        this.logger.warn('Requisição recebida sem a propriedade "message". Ignorando');
        return;
      }
      const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8')
      const complaintAanalyzed = JSON.parse(decodedData);

      this.logger.log('Conteúdo da denúncia: ', complaintAanalyzed)
      await this.reportingService.processReport(complaintAanalyzed)

      return {
        status: 'success',
        message: 'Denúncia processada com sucesso'
      }
    } catch (error) {
      this.logger.error('Erro ao processar denúncia:', error);

      return {
        status: 'error',
        message: error.message || 'Erro ao processar denúncia',
        error: error.stack
      };
    }
  }
}