# Configurações do Projeto
PROJECT_ID       := integracaon8n-486515
REGION           := us-central1
ENV              := dev
PREFIX           := date-me
IMAGE_NAME       := gcr.io/$(PROJECT_ID)/$(PREFIX)-api:latest

# Arquivos de configuração do Terraform
BACKEND_CONFIG   := tfenvs/config.gcs.tfbackend
VAR_FILE         := tfenvs/terraform.tfvars

# Comando completo de Deploy (Build + Push + Apply)
deploy: build push apply

build:
	@echo "--- Construindo a imagem Docker ---"
	docker build -t $(IMAGE_NAME) .

push:
	@echo "--- Enviando imagem para o GCR ---"
	docker push $(IMAGE_NAME)

apply:
	@echo "--- Iniciando Terraform Apply ---"
	terraform init -backend-config=$(BACKEND_CONFIG) -reconfigure
	terraform apply -auto-approve \
		-var="project_id=$(PROJECT_ID)" \
		-var="region=$(REGION)" \
		-var="env=$(ENV)" \
		-var="prefix=$(PREFIX)"

# Atalho apenas para o Terraform (caso a imagem já esteja lá)
infra:
	terraform apply -auto-approve \
		-var="project_id=$(PROJECT_ID)" \
		-var="region=$(REGION)" \
		-var="env=$(ENV)" \
		-var="prefix=$(PREFIX)"

# Atalho para destruir tudo com segurança
destroy:
	terraform destroy \
		-var="project_id=$(PROJECT_ID)" \
		-var="region=$(REGION)" \
		-var="env=$(ENV)" \
		-var="prefix=$(PREFIX)"