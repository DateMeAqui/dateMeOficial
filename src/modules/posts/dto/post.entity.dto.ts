import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Complaint } from 'src/modules/complaints/entities/complaint.entity';
import { User } from 'src/modules/users/entities/user.entity';

@ObjectType()
export class Post {
  
  @Field()
  id: string;

  @Field()
  content: string;

  @Field(() => [String], { nullable: true })
  imageUrl?: string[];

  @Field({ nullable: true })
  videoUrl: string;

  @Field()
  authorId: string; 

  @Field(() => User)
  author: User;

  @Field({description: ""})
  deletedStatus: boolean;

  @Field({ nullable: true, name: "deleted_at"})
  deletedAt?: Date;

  @Field({ name: "created_at"})
  createdAt: Date;

  @Field({ nullable: true, name: "updated_at"})
  updatedAt?: Date;

  @Field()
  reportedPublication: boolean;

  @Field(() => [Complaint], { nullable: true })
  complaints: Complaint[];

}
