import { Module } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { ComplaintsResolver } from './complaints.resolver';
import { GcpService } from '../gcp/gcp.service';
import { GcpModule } from '../gcp/gcp.module';

@Module({
  imports: [GcpModule],
  providers: [ComplaintsService, ComplaintsResolver],
  exports: [ComplaintsService]
})
export class ComplaintsModule {}
