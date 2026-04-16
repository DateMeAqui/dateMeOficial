// import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
// import { ReportingService } from './reporting.service';
// import { Reporting } from './entities/reporting.entity';
// import { CreateReportingInput } from './dto/create-reporting.input';
// import { UpdateReportingInput } from './dto/update-reporting.input';

// @Resolver(() => Reporting)
// export class ReportingResolver {
//   constructor(private readonly reportingService: ReportingService) {}

//   @Mutation(() => Reporting)
//   createReporting(@Args('createReportingInput') createReportingInput: CreateReportingInput) {
//     return this.reportingService.create(createReportingInput);
//   }

//   @Query(() => [Reporting], { name: 'reporting' })
//   findAll() {
//     return this.reportingService.findAll();
//   }

//   @Query(() => Reporting, { name: 'reporting' })
//   findOne(@Args('id', { type: () => Int }) id: number) {
//     return this.reportingService.findOne(id);
//   }

//   @Mutation(() => Reporting)
//   updateReporting(@Args('updateReportingInput') updateReportingInput: UpdateReportingInput) {
//     return this.reportingService.update(updateReportingInput.id, updateReportingInput);
//   }

//   @Mutation(() => Reporting)
//   removeReporting(@Args('id', { type: () => Int }) id: number) {
//     return this.reportingService.remove(id);
//   }
// }
