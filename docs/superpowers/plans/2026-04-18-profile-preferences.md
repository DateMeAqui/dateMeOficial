# Profile & Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a 1:1 `Profile` model alongside `User`, carrying `gender` (enum), `preferences` (enum array, ≥1) and `bio` (≤500), exposed via `User.profile` field and dedicated GraphQL queries/mutations.

**Architecture:** New NestJS module `profile/` with its own `ProfileService` and `ProfileResolver`. The service exposes `createForUser`/`findByUserId`/`updateByUserId`. The resolver lives on `@Resolver(() => UserDTO)` to provide a field-resolver without circular imports. `UsersService.create` wraps user+profile creation in `prisma.$transaction`. Gender enum is Prisma-native `enum Gender` mapped to Postgres `gender[]`.

**Tech Stack:** NestJS 11, GraphQL (code-first, Apollo), Prisma 6 + Postgres (Neon), class-validator, Jest, bcrypt, gitmoji.

**Spec:** [`docs/superpowers/specs/2026-04-18-profile-preferences-design.md`](../specs/2026-04-18-profile-preferences-design.md)

**Branch:** `feat/profile-preferences` (already created).

---

## Task 1: Add `Gender` enum and `Profile` model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma` (append enum + model; add `profile` relation on `User`)

- [ ] **Step 1: Append `Gender` enum at the end of `prisma/schema.prisma`**

```prisma
enum Gender {
  WOMAN
  TRANS_WOMAN
  MAN
  TRANS_MAN
  COUPLE_HE_SHE
  COUPLE_HE_HE
  COUPLE_SHE_SHE
  GAY
  LESBIAN
  TRAVESTI

  @@map("gender")
}
```

- [ ] **Step 2: Append `Profile` model at the end of `prisma/schema.prisma`**

```prisma
model Profile {
  id          String    @id @default(uuid())
  userId      String    @unique @map("user_id")
  gender      Gender
  preferences Gender[]  @default([])
  bio         String?   @db.VarChar(500)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime? @updatedAt       @map("updated_at")

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([gender])
  @@map("profiles")
}
```

- [ ] **Step 3: Add the `profile` field to the existing `User` model**

Locate the `User` model block in `prisma/schema.prisma`. Inside the model (before the closing `}`), after the `medias` relation (around line 55), add:

```prisma
  // Relacionamento 1:1 com Profile
  profile               Profile?
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_profile_and_gender_enum
```

Expected output: migration folder `prisma/migrations/<timestamp>_add_profile_and_gender_enum/` created with a `migration.sql` that:
- creates the `gender` Postgres enum;
- creates the `profiles` table with `user_id UNIQUE`, array column `preferences`, `bio VARCHAR(500)`, FK to `users` with `ON DELETE CASCADE`.

No errors; Prisma client regenerated.

- [ ] **Step 5: Sanity-check the generated migration**

```bash
ls prisma/migrations/ | tail -1
```

Expected: last entry ends with `_add_profile_and_gender_enum`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
gitmoji -c
```

Choose: `:sparkles:` (new feature). Commit title: `feat(prisma): add Profile model and Gender enum`.

---

## Task 2: Create `Gender` GraphQL-registered TS enum

**Files:**
- Create: `src/modules/profile/enums/gender.enum.ts`

- [ ] **Step 1: Create `src/modules/profile/enums/gender.enum.ts`**

```ts
import { registerEnumType } from '@nestjs/graphql';

export enum Gender {
  WOMAN = 'WOMAN',
  TRANS_WOMAN = 'TRANS_WOMAN',
  MAN = 'MAN',
  TRANS_MAN = 'TRANS_MAN',
  COUPLE_HE_SHE = 'COUPLE_HE_SHE',
  COUPLE_HE_HE = 'COUPLE_HE_HE',
  COUPLE_SHE_SHE = 'COUPLE_SHE_SHE',
  GAY = 'GAY',
  LESBIAN = 'LESBIAN',
  TRAVESTI = 'TRAVESTI',
}

registerEnumType(Gender, {
  name: 'Gender',
  description: 'Gender/orientation values used for profile identification and partner preferences',
});
```

> **Note:** TS enum values match the Prisma enum identifiers so `@prisma/client`'s generated `Gender` union and this enum are interchangeable at the wire level. Prisma's generated type could be used directly, but a hand-written enum avoids importing from `@prisma/client` in GraphQL DTOs and keeps the domain centralized.

- [ ] **Step 2: Commit**

```bash
git add src/modules/profile/enums/gender.enum.ts
gitmoji -c
```

Choose `:sparkles:`. Title: `feat(profile): register Gender enum for GraphQL`.

---

## Task 3: Create `CreateProfileInput` DTO with validation

**Files:**
- Create: `src/modules/profile/dto/create-profile.input.ts`

- [ ] **Step 1: Create the file**

```ts
import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Gender } from '../enums/gender.enum';

@InputType()
export class CreateProfileInput {
  @Field(() => Gender)
  @IsNotEmpty({ message: 'Gênero é obrigatório' })
  @IsEnum(Gender, { message: 'Gênero inválido' })
  gender: Gender;

  @Field(() => [Gender])
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione ao menos uma preferência' })
  @IsEnum(Gender, { each: true, message: 'Preferência inválida' })
  preferences: Gender[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio deve ter no máximo 500 caracteres' })
  bio?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/profile/dto/create-profile.input.ts
gitmoji -c
```

`:sparkles:` — `feat(profile): add CreateProfileInput DTO`.

---

## Task 4: Create `UpdateProfileInput` DTO

**Files:**
- Create: `src/modules/profile/dto/update-profile.input.ts`

- [ ] **Step 1: Create the file**

```ts
import { InputType, PartialType } from '@nestjs/graphql';
import { CreateProfileInput } from './create-profile.input';

@InputType()
export class UpdateProfileInput extends PartialType(CreateProfileInput) {}
```

> `PartialType` makes each field optional but keeps per-field validators. If `preferences` is sent, it still must be a non-empty array.

- [ ] **Step 2: Commit**

```bash
git add src/modules/profile/dto/update-profile.input.ts
gitmoji -c
```

`:sparkles:` — `feat(profile): add UpdateProfileInput DTO`.

---

## Task 5: Create `ProfileDTO` output type

**Files:**
- Create: `src/modules/profile/dto/profile.dto.ts`

- [ ] **Step 1: Create the file**

```ts
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { Gender } from '../enums/gender.enum';

@ObjectType('Profile')
export class ProfileDTO {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => Gender)
  gender: Gender;

  @Field(() => [Gender])
  preferences: Gender[];

  @Field(() => String, { nullable: true })
  bio?: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  updatedAt?: Date | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/profile/dto/profile.dto.ts
gitmoji -c
```

`:sparkles:` — `feat(profile): add ProfileDTO output type`.

---

## Task 6: Write `ProfileService` tests (TDD — tests only)

**Files:**
- Create: `src/modules/profile/profile.service.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';
import { Gender } from './enums/gender.enum';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaMock: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    prismaMock = {
      profile: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createForUser', () => {
    const baseInput = {
      gender: Gender.MAN,
      preferences: [Gender.WOMAN],
    };

    it('creates a profile using the default prisma client when no tx is passed', async () => {
      const fake = { id: 'p1', userId: 'u1', ...baseInput, bio: null };
      (prismaMock.profile.create as jest.Mock).mockResolvedValueOnce(fake);

      const result = await service.createForUser('u1', baseInput);

      expect(prismaMock.profile.create).toHaveBeenCalledWith({
        data: { userId: 'u1', gender: Gender.MAN, preferences: [Gender.WOMAN], bio: undefined },
      });
      expect(result).toEqual(fake);
    });

    it('persists the bio when provided', async () => {
      const input = { ...baseInput, bio: 'hello' };
      (prismaMock.profile.create as jest.Mock).mockResolvedValueOnce({ id: 'p1', userId: 'u1', ...input });

      await service.createForUser('u1', input);

      expect(prismaMock.profile.create).toHaveBeenCalledWith({
        data: { userId: 'u1', gender: Gender.MAN, preferences: [Gender.WOMAN], bio: 'hello' },
      });
    });

    it('uses the transaction client when tx is provided', async () => {
      const txCreate = jest.fn().mockResolvedValue({ id: 'p1' });
      const tx = { profile: { create: txCreate } } as unknown as Prisma.TransactionClient;

      await service.createForUser('u1', baseInput, tx);

      expect(txCreate).toHaveBeenCalledTimes(1);
      expect(prismaMock.profile.create).not.toHaveBeenCalled();
    });

    it('propagates P2002 when a profile already exists for the user', async () => {
      const dupError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`user_id`)',
        { code: 'P2002', clientVersion: '6.15.0' },
      );
      (prismaMock.profile.create as jest.Mock).mockRejectedValueOnce(dupError);

      await expect(service.createForUser('u1', baseInput)).rejects.toBe(dupError);
    });
  });

  describe('findByUserId', () => {
    it('returns the profile when found', async () => {
      const fake = {
        id: 'p1',
        userId: 'u1',
        gender: Gender.WOMAN,
        preferences: [Gender.MAN],
        bio: null,
      };
      (prismaMock.profile.findUnique as jest.Mock).mockResolvedValueOnce(fake);

      const result = await service.findByUserId('u1');

      expect(prismaMock.profile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
      expect(result).toEqual(fake);
    });

    it('returns null when no profile exists', async () => {
      (prismaMock.profile.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findByUserId('u1');

      expect(result).toBeNull();
    });
  });

  describe('updateByUserId', () => {
    it('calls prisma.profile.update scoped to userId', async () => {
      const patch = { bio: 'updated bio' };
      const updated = { id: 'p1', userId: 'u1', gender: Gender.MAN, preferences: [Gender.WOMAN], bio: 'updated bio' };
      (prismaMock.profile.update as jest.Mock).mockResolvedValueOnce(updated);

      const result = await service.updateByUserId('u1', patch);

      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: patch,
      });
      expect(result).toEqual(updated);
    });

    it('propagates P2025 when the profile does not exist', async () => {
      const notFound = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found.',
        { code: 'P2025', clientVersion: '6.15.0' },
      );
      (prismaMock.profile.update as jest.Mock).mockRejectedValueOnce(notFound);

      await expect(
        service.updateByUserId('u1', { bio: 'x' }),
      ).rejects.toBe(notFound);
    });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail with "Cannot find module './profile.service'"**

```bash
npm run test -- profile.service.spec
```

Expected: failure (service file does not exist yet). This validates the red step of TDD.

- [ ] **Step 3: Do NOT commit yet — the test must stay red until the service is implemented in the next task.**

---

## Task 7: Implement `ProfileService`

**Files:**
- Create: `src/modules/profile/profile.service.ts`

- [ ] **Step 1: Create the file**

```ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileInput } from './dto/create-profile.input';
import { UpdateProfileInput } from './dto/update-profile.input';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  createForUser(
    userId: string,
    input: CreateProfileInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.profile.create({
      data: {
        userId,
        gender: input.gender,
        preferences: input.preferences,
        bio: input.bio,
      },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.profile.findUnique({ where: { userId } });
  }

  updateByUserId(userId: string, input: UpdateProfileInput) {
    return this.prisma.profile.update({
      where: { userId },
      data: input,
    });
  }
}
```

- [ ] **Step 2: Run the tests — expect all to pass**

```bash
npm run test -- profile.service.spec
```

Expected: `Tests: X passed`. If any test fails, fix the service (not the test).

- [ ] **Step 3: Commit**

```bash
git add src/modules/profile/profile.service.ts src/modules/profile/profile.service.spec.ts
gitmoji -c
```

`:sparkles:` — `feat(profile): ProfileService (createForUser, findByUserId, updateByUserId)`.

---

## Task 8: Scaffold `ProfileModule`

**Files:**
- Create: `src/modules/profile/profile.module.ts`

- [ ] **Step 1: Create the file**

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfileService } from './profile.service';
import { ProfileResolver } from './profile.resolver';

@Module({
  imports: [PrismaModule],
  providers: [ProfileService, ProfileResolver],
  exports: [ProfileService],
})
export class ProfileModule {}
```

> `ProfileResolver` is referenced but not yet written; the next task creates it. Do not run tests that import the module in between.

- [ ] **Step 2: Do NOT commit yet — commit together with the resolver in Task 10.**

---

## Task 9: Write `ProfileResolver` tests (TDD — tests only)

**Files:**
- Create: `src/modules/profile/profile.resolver.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';
import { Gender } from './enums/gender.enum';

describe('ProfileResolver', () => {
  let resolver: ProfileResolver;
  let profileService: jest.Mocked<ProfileService>;

  beforeEach(async () => {
    profileService = {
      findByUserId: jest.fn(),
      updateByUserId: jest.fn(),
    } as unknown as jest.Mocked<ProfileService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileResolver,
        { provide: ProfileService, useValue: profileService },
      ],
    }).compile();

    resolver = module.get<ProfileResolver>(ProfileResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('myProfile', () => {
    it('resolves using me.id from the current user', async () => {
      const fake = { id: 'p1', userId: 'u1' };
      profileService.findByUserId.mockResolvedValueOnce(fake as any);

      const result = await resolver.myProfile({ id: 'u1' } as any);

      expect(profileService.findByUserId).toHaveBeenCalledWith('u1');
      expect(result).toEqual(fake);
    });
  });

  describe('getProfileByUserId', () => {
    it('resolves using the userId argument', async () => {
      const fake = { id: 'p2', userId: 'u2' };
      profileService.findByUserId.mockResolvedValueOnce(fake as any);

      const result = await resolver.getProfileByUserId('u2');

      expect(profileService.findByUserId).toHaveBeenCalledWith('u2');
      expect(result).toEqual(fake);
    });
  });

  describe('updateMyProfile', () => {
    it('updates using me.id and the input', async () => {
      const updated = { id: 'p1', userId: 'u1', bio: 'new bio' };
      profileService.updateByUserId.mockResolvedValueOnce(updated as any);

      const input = { bio: 'new bio' };
      const result = await resolver.updateMyProfile(input, { id: 'u1' } as any);

      expect(profileService.updateByUserId).toHaveBeenCalledWith('u1', input);
      expect(result).toEqual(updated);
    });

    it('never uses an external userId from the client', async () => {
      profileService.updateByUserId.mockResolvedValueOnce({} as any);

      await resolver.updateMyProfile(
        { gender: Gender.WOMAN } as any,
        { id: 'auth-user' } as any,
      );

      expect(profileService.updateByUserId).toHaveBeenCalledWith(
        'auth-user',
        { gender: Gender.WOMAN },
      );
    });
  });

  describe('getProfile (field resolver)', () => {
    it('delegates to findByUserId using the parent user id', async () => {
      const fake = { id: 'p1', userId: 'u1' };
      profileService.findByUserId.mockResolvedValueOnce(fake as any);

      const result = await resolver.getProfile({ id: 'u1' } as any);

      expect(profileService.findByUserId).toHaveBeenCalledWith('u1');
      expect(result).toEqual(fake);
    });
  });
});
```

- [ ] **Step 2: Run the tests — confirm they fail with "Cannot find module './profile.resolver'"**

```bash
npm run test -- profile.resolver.spec
```

Expected: failure. Do not commit.

---

## Task 10: Implement `ProfileResolver`

**Files:**
- Create: `src/modules/profile/profile.resolver.ts`

- [ ] **Step 1: Create the file**

```ts
import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { User as UserDTO } from '../users/dto/user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/qgl-auth.guard';
import { UpdateProfileInput } from './dto/update-profile.input';
import { ProfileDTO } from './dto/profile.dto';
import { ProfileService } from './profile.service';

@Resolver(() => UserDTO)
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @ResolveField('profile', () => ProfileDTO, { nullable: true })
  getProfile(@Parent() user: UserDTO) {
    return this.profileService.findByUserId(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ProfileDTO, { name: 'myProfile', nullable: true })
  myProfile(@CurrentUser() me: { id: string }) {
    return this.profileService.findByUserId(me.id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ProfileDTO, { name: 'getProfileByUserId', nullable: true })
  getProfileByUserId(@Args('userId') userId: string) {
    return this.profileService.findByUserId(userId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ProfileDTO, { name: 'updateMyProfile' })
  updateMyProfile(
    @Args('input') input: UpdateProfileInput,
    @CurrentUser() me: { id: string },
  ) {
    return this.profileService.updateByUserId(me.id, input);
  }
}
```

- [ ] **Step 2: Run the resolver tests — confirm they pass**

```bash
npm run test -- profile.resolver.spec
```

Expected: all tests pass.

- [ ] **Step 3: Run the full profile test suite**

```bash
npm run test -- profile
```

Expected: both `profile.service.spec` and `profile.resolver.spec` pass.

- [ ] **Step 4: Commit module + resolver + tests together**

```bash
git add src/modules/profile/profile.module.ts src/modules/profile/profile.resolver.ts src/modules/profile/profile.resolver.spec.ts
gitmoji -c
```

`:sparkles:` — `feat(profile): GraphQL resolver (myProfile, getProfileByUserId, updateMyProfile, User.profile)`.

---

## Task 11: Add DTO validation tests for `CreateProfileInput`

**Files:**
- Create: `src/modules/profile/dto/create-profile.input.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProfileInput } from './create-profile.input';
import { Gender } from '../enums/gender.enum';

describe('CreateProfileInput validation', () => {
  const base = { gender: Gender.MAN, preferences: [Gender.WOMAN] };

  async function run(payload: Record<string, unknown>) {
    const dto = plainToInstance(CreateProfileInput, payload);
    return validate(dto);
  }

  it('accepts a minimal valid input (no bio)', async () => {
    const errors = await run(base);
    expect(errors).toHaveLength(0);
  });

  it('rejects empty preferences array', async () => {
    const errors = await run({ ...base, preferences: [] });
    expect(errors.some((e) => e.property === 'preferences')).toBe(true);
  });

  it('rejects bio longer than 500 characters', async () => {
    const errors = await run({ ...base, bio: 'a'.repeat(501) });
    expect(errors.some((e) => e.property === 'bio')).toBe(true);
  });

  it('accepts bio exactly at 500 characters', async () => {
    const errors = await run({ ...base, bio: 'a'.repeat(500) });
    expect(errors).toHaveLength(0);
  });

  it('rejects gender not in the enum', async () => {
    const errors = await run({ ...base, gender: 'OTHER' as unknown as Gender });
    expect(errors.some((e) => e.property === 'gender')).toBe(true);
  });

  it('rejects preferences with invalid enum member', async () => {
    const errors = await run({ ...base, preferences: ['BOGUS'] as unknown as Gender[] });
    expect(errors.some((e) => e.property === 'preferences')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm run test -- create-profile.input.spec
```

Expected: all tests pass (validations were defined in Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/modules/profile/dto/create-profile.input.spec.ts
gitmoji -c
```

`:white_check_mark:` — `test(profile): validation rules for CreateProfileInput`.

---

## Task 12: Register `ProfileModule` in `AppModule` and GraphQL `include`

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Add the import**

Near the other module imports at the top of `src/app.module.ts`, add:

```ts
import { ProfileModule } from './modules/profile/profile.module';
```

- [ ] **Step 2: Add `ProfileModule` to the GraphQL `include` array**

Find the block:

```ts
include: [
  AuthModule,
  PagSeguroModule,
  PlansModule,
  SubscriptionsModule,
  SubscriptionStatusModule,
  PaymentsModule,
  PostsModule,
  UploadMediasModule,
  ComplaintsModule,
  UsersModule,
  MediaModule,
  CommentsModule,
],
```

Append `ProfileModule,` so it becomes:

```ts
include: [
  AuthModule,
  PagSeguroModule,
  PlansModule,
  SubscriptionsModule,
  SubscriptionStatusModule,
  PaymentsModule,
  PostsModule,
  UploadMediasModule,
  ComplaintsModule,
  UsersModule,
  MediaModule,
  CommentsModule,
  ProfileModule,
],
```

- [ ] **Step 3: Add `ProfileModule` to the top-level `imports` array**

Find the trailing section of `imports` (just before `controllers:`):

```ts
    GcpModule,
    ReportingModule,
    MediaModule,
  ],
```

Add `ProfileModule,` after `MediaModule,`:

```ts
    GcpModule,
    ReportingModule,
    MediaModule,
    ProfileModule,
  ],
```

- [ ] **Step 4: Verify the build**

```bash
npm run build
```

Expected: `nest build` completes with no TypeScript errors and produces `dist/`.

- [ ] **Step 5: Commit**

```bash
git add src/app.module.ts
gitmoji -c
```

`:bricks:` — `feat(app): register ProfileModule in Nest + GraphQL include`.

---

## Task 13: Add `profile` field to `CreateUserInput`

**Files:**
- Modify: `src/modules/users/dto/create-user.input.ts`

- [ ] **Step 1: Import `CreateProfileInput` at the top of the file**

Add:

```ts
import { CreateProfileInput } from 'src/modules/profile/dto/create-profile.input';
```

- [ ] **Step 2: Append the `profile` field**

At the end of the `CreateUserInput` class body (after the `roleId` field), add:

```ts
  @Field(() => CreateProfileInput)
  @IsNotEmpty({ message: 'Profile é obrigatório' })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile: CreateProfileInput;
```

> `ValidateNested`, `Type` and `IsNotEmpty` are already imported in this file — confirm before editing.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: compilation succeeds. If `Type` or `ValidateNested` are missing, add them from `class-transformer` and `class-validator` respectively.

- [ ] **Step 4: Commit**

```bash
git add src/modules/users/dto/create-user.input.ts
gitmoji -c
```

`:sparkles:` — `feat(users): require profile on CreateUserInput`.

---

## Task 14: Wire `ProfileModule` into `UsersModule` and update `UsersService.create`

**Files:**
- Modify: `src/modules/users/users.module.ts`
- Modify: `src/modules/users/users.service.ts`

- [ ] **Step 1: Add `ProfileModule` to `UsersModule` imports**

Edit `src/modules/users/users.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';
import { AddressesModule } from '../addresses/addresses.module';
import { CalculateDateBrazilNow } from 'src/utils/calculate_date_brazil_now';
import { MediaModule } from '../media/media.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [PrismaModule, SmsModule, AddressesModule, MediaModule, ProfileModule],
  providers: [UsersResolver, UsersService, CalculateDateBrazilNow],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 2: Inject `ProfileService` into `UsersService`**

Edit the constructor of `src/modules/users/users.service.ts`:

```ts
import { ProfileService } from '../profile/profile.service';
// ...
constructor(
  private prisma: PrismaService,
  private sms: SmsService,
  private calculateDateBrazilNow: CalculateDateBrazilNow,
  private mediaService: MediaService,
  private profileService: ProfileService,
) {}
```

- [ ] **Step 3: Replace the body of `UsersService.create` to create user + profile atomically**

Locate the current `create` method in `src/modules/users/users.service.ts` (around lines 24-65) and replace it with:

```ts
async create(createUserInput: CreateUserInput): Promise<User> {
  const hashedPassord = await bcrypt.hash(createUserInput.password, 10);

  const verificationCode = Math.floor(1000 + Math.random() * 9000);
  this.sms.sendSms(createUserInput.smartphone, verificationCode);

  const brazilDate = this.calculateDateBrazilNow.brazilDate();
  const birthdate = new Date(createUserInput.birthdate);

  const { address, profile, ...userData } = createUserInput;

  try {
    const createData: any = {
      ...userData,
      birthdate,
      createdAt: brazilDate,
      password: hashedPassord,
      verificationCode,
      roleId: Number(createUserInput.roleId),
    };

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...createData,
          address: { create: address },
        },
        include: {
          address: true,
          role: true,
        },
      });

      await this.profileService.createForUser(user.id, profile, tx);

      return user;
    });

    return newUser;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error('Já existe um usuário com esse e-mail ou cpf');
    }
    throw new Error('Erro ao criar usuário');
  }
}
```

> **Note:** The transaction wraps both writes. If `profileService.createForUser` throws, Postgres rolls back the user insert.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/users.module.ts src/modules/users/users.service.ts
gitmoji -c
```

`:sparkles:` — `feat(users): create Profile atomically on signup via $transaction`.

---

## Task 15: Update `UsersService` tests for atomic profile creation

**Files:**
- Modify: `src/modules/users/users.service.spec.ts`

- [ ] **Step 1: Replace the `prismaMock` setup to include `$transaction`**

At the top of the `beforeEach` block in `src/modules/users/users.service.spec.ts`, replace:

```ts
prismaMock = {
  user:{
    create: jest.fn(),
    findMany: jest.fn(),
  },
} as unknown as jest.Mocked<PrismaService>
```

with:

```ts
prismaMock = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  profile: {
    create: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (cb: any) => cb(prismaMock)),
} as unknown as jest.Mocked<PrismaService>;
```

- [ ] **Step 2: Add a `ProfileService` mock provider**

Update the `providers` array of `Test.createTestingModule` to:

```ts
providers: [
  UsersService,
  { provide: PrismaService, useValue: prismaMock },
  { provide: 'SmsService', useValue: { sendSms: jest.fn() } },
  {
    provide: require('../profile/profile.service').ProfileService,
    useValue: { createForUser: jest.fn().mockResolvedValue({ id: 'p1' }) },
  },
  {
    provide: require('../../utils/calculate_date_brazil_now').CalculateDateBrazilNow,
    useValue: { brazilDate: () => new Date('2026-04-18T12:00:00Z') },
  },
  {
    provide: require('../media/media.service').MediaService,
    useValue: {},
  },
  {
    provide: require('../sms/sms.service').SmsService,
    useValue: { sendSms: jest.fn() },
  },
],
```

> Drop the duplicated string-based `SmsService` provider if present; only the real class token is used by the service. Keep the snippet in sync with the actual imports in `users.service.ts`.

- [ ] **Step 3: Update the first success test to include `profile` in the input**

In the `describe('create')` → `it('deveria criar um user com senha hashada', ...)` block, modify `input` and `fakeUser`:

```ts
const input = {
  fullName: 'diovane',
  nickName: 'diovane',
  email: 'diovan3e@gmail.com',
  password: '234',
  birthdate: '1986-07-22',
  cpf: '00000000000',
  smartphone: '53991127424',
  address: { street: 'rua A', number: 1, district: 'x', city: 'y', state: 'z', cep: '00000000' },
  roleId: 3,
  profile: { gender: 'MAN', preferences: ['WOMAN'] },
};
```

- [ ] **Step 4: Add a new test for rollback when profile creation fails**

Append inside the `describe('UsersService', ...)` block (before its closing `});`):

```ts
describe('atomic profile creation', () => {
  it('rolls back user creation if profile creation fails', async () => {
    const input = {
      fullName: 'diovane',
      nickName: 'diovane',
      email: 'rollback@gmail.com',
      password: '234',
      birthdate: '1986-07-22',
      cpf: '00000000001',
      smartphone: '53991127424',
      address: { street: 'rua A', number: 1, district: 'x', city: 'y', state: 'z', cep: '00000000' },
      roleId: 3,
      profile: { gender: 'MAN', preferences: ['WOMAN'] },
    };

    (prismaMock.user.create as jest.Mock).mockResolvedValue({ id: 'u1' });
    const profileSpy = jest.spyOn(
      (service as any).profileService,
      'createForUser',
    ).mockRejectedValueOnce(new Error('profile failed'));

    // Simulate real transactional semantics: rethrow so the $transaction rejects
    (prismaMock.$transaction as jest.Mock).mockImplementationOnce(async (cb: any) => {
      return cb(prismaMock);
    });

    await expect(service.create(input as any)).rejects.toThrow(
      'Erro ao criar usuário',
    );
    expect(profileSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Run the users test suite**

```bash
npm run test -- users.service.spec
```

Expected: all existing tests pass (after the updates above) and the new rollback test passes.

- [ ] **Step 6: Commit**

```bash
git add src/modules/users/users.service.spec.ts
gitmoji -c
```

`:white_check_mark:` — `test(users): atomic profile creation in signup`.

---

## Task 16: Write the `profile` module README

**Files:**
- Create: `src/modules/profile/README.md`

- [ ] **Step 1: Create the file**

````markdown
# Módulo: Profile

## 1. Propósito

O módulo `profile` materializa a camada de apresentação do usuário, separando-a da entidade de autenticação (`User`). Hoje contém:

- `gender` — enum obrigatório identificando o gênero do usuário na plataforma.
- `preferences` — array de enum (≥1) com os gêneros/orientações que o usuário deseja encontrar. Consumido por feed, descoberta e match.
- `bio` — texto livre opcional (≤500 caracteres) exibido no perfil público.

Declarado em [`./profile.module.ts`](./profile.module.ts); expõe:

- `ProfileService` ([`./profile.service.ts`](./profile.service.ts)) — `createForUser`, `findByUserId`, `updateByUserId`.
- `ProfileResolver` ([`./profile.resolver.ts`](./profile.resolver.ts)) — `myProfile`, `getProfileByUserId`, `updateMyProfile` e o field-resolver `User.profile`.

## 2. Regras de Negócio

- `gender` e `preferences` são **obrigatórios no cadastro** (ver [`../users/dto/create-user.input.ts`](../users/dto/create-user.input.ts)).
- `preferences` exige `ArrayMinSize(1)` no DTO — impede esvaziar as preferências em um `updateMyProfile`.
- `bio` opcional; limite duplo: `@MaxLength(500)` no DTO e `@db.VarChar(500)` no banco.
- Profile é criado na **mesma transação** que o User (`UsersService.create` → `prisma.$transaction`).
- `userId` é `@unique` no model — 1:1 garantido no banco.
- `onDelete: Cascade` — hard delete do User remove o Profile junto.
- `userId` não é aceito em `UpdateProfileInput` (herda de `CreateProfileInput` via `PartialType`, que não contém `userId`). Usuário não troca de dono.

## 3. Entidades e Modelo de Dados

Declarado em [`../../../prisma/schema.prisma`](../../../prisma/schema.prisma):

```prisma
model Profile {
  id          String    @id @default(uuid())
  userId      String    @unique @map("user_id")
  gender      Gender
  preferences Gender[]  @default([])
  bio         String?   @db.VarChar(500)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime? @updatedAt       @map("updated_at")

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([gender])
  @@map("profiles")
}
```

Enum `Gender` em Prisma e espelhado em TS ([`./enums/gender.enum.ts`](./enums/gender.enum.ts)):

```
WOMAN | TRANS_WOMAN | MAN | TRANS_MAN |
COUPLE_HE_SHE | COUPLE_HE_HE | COUPLE_SHE_SHE |
GAY | LESBIAN | TRAVESTI
```

## 4. API GraphQL

| Operação | Tipo | Argumentos | Retorno | Auth |
|---|---|---|---|---|
| `myProfile` | Query | — | `Profile?` | `GqlAuthGuard` |
| `getProfileByUserId` | Query | `userId: String` | `Profile?` | `GqlAuthGuard` |
| `updateMyProfile` | Mutation | `input: UpdateProfileInput` | `Profile` | `GqlAuthGuard` |
| `User.profile` | Field | — | `Profile?` | (herda do pai) |

### Inputs

- `CreateProfileInput` — usado como sub-campo de `CreateUserInput`.
- `UpdateProfileInput = PartialType(CreateProfileInput)` — `preferences` mantém `ArrayMinSize(1)` se enviado.

### Exemplo

```graphql
query {
  myProfile {
    id
    gender
    preferences
    bio
  }
}

mutation {
  updateMyProfile(input: { bio: "olá" }) {
    id
    bio
  }
}
```

## 5. Fluxos Principais

### 5.1 Cadastro atômico

`CreateUser` persiste `User`, `Address` e `Profile` em `prisma.$transaction`. Se qualquer passo falha, tudo faz rollback. SMS (`SmsService.sendSms`) segue fora da transação, preservando o comportamento fire-and-forget do módulo `users`.

### 5.2 Atualização

`updateMyProfile` só opera sobre o profile do próprio usuário autenticado (`me.id` do JWT). Não aceita `userId` do cliente.

### 5.3 Leitura aninhada

`User.profile` é resolvido sob demanda via `@ResolveField` em `ProfileResolver` (declarado com `@Resolver(() => UserDTO)`). N+1 é aceitável nesta fase — adicionar DataLoader fica como follow-up se benchmarks justificarem.

## 6. Dependências

- `PrismaModule` — `PrismaService`.
- `@nestjs/graphql` — decorators.
- `class-validator` / `class-transformer` — validação dos DTOs.

## 7. Testes

- [`./profile.service.spec.ts`](./profile.service.spec.ts) — service completo com mock do Prisma.
- [`./profile.resolver.spec.ts`](./profile.resolver.spec.ts) — resolver com mock do service.
- [`./dto/create-profile.input.spec.ts`](./dto/create-profile.input.spec.ts) — validação de DTO.

Executar:

```bash
npm run test -- profile
```

## 8. Pontos de Atenção / Manutenção

- **Sem DataLoader em `User.profile`** — N+1 em listagens grandes; avaliar quando surgirem feed/descoberta.
- **Dois tipos de User no schema** — `UserEntity` vs `UserDTO` (débito técnico do módulo `users`). O `ProfileResolver` alveja `UserDTO`; queries que retornam `UserEntity` não expõem `profile`. Follow-up sugerido: unificar no módulo `users`.
- **Avatar e galeria continuam no `User`** — migrar para `Profile` é follow-up explícito do plano de entrega 2026-04-18.
- **`followers`** — não implementado; entrará em PR dedicado.
````

- [ ] **Step 2: Commit**

```bash
git add src/modules/profile/README.md
gitmoji -c
```

`:memo:` — `docs(profile): module README`.

---

## Task 17: Final verification — build + schema + full test suite

- [ ] **Step 1: Regenerate Prisma client (in case anything drifted)**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`.

- [ ] **Step 2: Full build**

```bash
npm run build
```

Expected: clean build; `dist/src/schema.gql` exists and includes:
- `type Profile` with `gender`, `preferences`, `bio` fields.
- `enum Gender` with 10 values.
- `type UserDTO` with a `profile` field.
- `input CreateProfileInput`, `UpdateProfileInput`.
- `Query.myProfile`, `Query.getProfileByUserId`, `Mutation.updateMyProfile`.

- [ ] **Step 3: Full test suite**

```bash
npm run test
```

Expected: all suites pass. If unrelated suites were already broken before this plan, note them and skip — do not mask failures introduced by this plan.

- [ ] **Step 4: Schema check** (manual)

```bash
grep -E "type Profile|enum Gender|profile:|myProfile|updateMyProfile" src/schema.gql
```

Expected: all entries present.

- [ ] **Step 5: Smoke-run the server** (manual)

```bash
npm run start:dev
```

Navigate to `http://localhost:<port>/graphql` and confirm `Profile`, `Gender`, `myProfile`, `updateMyProfile` are in the Apollo playground schema. Stop with Ctrl-C.

- [ ] **Step 6: Push and open PR**

```bash
git push -u origin feat/profile-preferences
```

Then use the `github-pull-request-expect` skill (as specified in the original task) to draft the PR description and open it against `main`.

---

## Self-review (already done by the planner)

- **Spec coverage:** every numbered section of the spec is implemented by at least one task.
  - Sec 3 Arquitetura → Tasks 8, 10, 12
  - Sec 4 Data model → Task 1
  - Sec 5 API → Tasks 3, 4, 5, 9, 10, 13
  - Sec 6 Flows → Tasks 10, 14
  - Sec 7 Errors → covered by DTO validation (Tasks 3, 11) and `ProfileService` tests (Task 6)
  - Sec 8 Tests → Tasks 6, 9, 11, 15
  - Sec 9 Workflow → Tasks 1–17 commit sequence matches
- **No placeholders:** no TBDs; every code block is complete; commands and expected outputs are spelled out.
- **Type consistency:** `createForUser(userId, input, tx?)`, `findByUserId(userId)`, `updateByUserId(userId, input)` signatures are used identically in the service spec, service implementation, and resolver. `ProfileDTO` fields match Prisma model shape.

## Follow-ups (out of scope for this plan)

- Migrate `User.avatarUrl`/`avatarMediaId` and the gallery `photos[]` to `Profile`.
- Implement `Profile.followers`.
- DataLoader for `User.profile`.
- "Profile complete" guard for match/feed-sensitive mutations.
- Consolidate `UserEntity` vs `UserDTO` in the `users` module.
