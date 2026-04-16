import { ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthGuard } from "@nestjs/passport";


export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector){
        super();
    }

    canActivate(context: ExecutionContext) {
        if(process.argv.includes('--generate-only') || process.env.MOCK_PRISMA === 'true') {
            return true;
        }
    
        //verifica se a rota está marcada como pública
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        //Se for uma rota pública, permitir acesso
        if(isPublic) {
            return true;
        }

        //Verificar se estamos lidando com uma mutation createUser
        const ctx = GqlExecutionContext.create(context);
        const { fieldName } = ctx.getInfo();

        //Permitir acesso à rota de criação de usuário sem autenticação
        if (fieldName === 'CreateUser') {
            return true;
        }

        //Para todas as outras rotas, exigir autenticação JWT
        return super.canActivate(context)
    }

    getRequest(context: ExecutionContext) {
        const ctx = GqlExecutionContext.create(context)
        const request = ctx.getContext().req;
        return request
    }
}