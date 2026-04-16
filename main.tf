data "google_project" "current" {
  project_id = var.project_id
}

resource "google_service_account" "service_account" {
  account_id   = var.prefix
  display_name = "Service Account for ${var.prefix} application."
  project      = var.project_id
}

locals {
    service_account = "${var.prefix}@${var.project_id}.iam.gserviceaccount.com"
    labels = {
        service   = var.prefix
        terraform = "true"
    }
}

resource "google_cloud_run_v2_service" "cloudrun_private_api" {
    name     =  "${var.prefix}-public-api"
    project  = var.project_id
    location = var.region
    deletion_protection = false

    template {
        service_account = local.service_account
        containers {
            image = "gcr.io/${var.project_id}/${var.prefix}-api:latest"
            
            # Variável de Ambiente: ENV
            env {
                name  = "ENV"
                value = var.env
            }

            env {
                name  = "DATABASE_URL"
                value = "postgresql://neondb_owner:npg_TvlrMRZV5ky6@ep-plain-queen-acnnzeyu-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
            }

            env {
                name  = "REDIS_HOST"
                value = "redis-14949.c8.us-east-1-4.ec2.cloud.redislabs.com"
            }

            env {
                name  = "REDIS_PORT"
                value = "14949"
            }

            env {
                name  = "REDIS_PASSWORD"
                value = "6tAYE2QlFy0uhuz3HGP8Gf9CFHCAJdS7" 
            }

            env {
                name  = "JWT_SECRET"
                value = "VALOR_DO_SEU_ENV"
            }
            env {
                name  = "PAGSEGURO_TOKEN"
                value = "VALOR_DO_SEU_ENV"
            }
            env {
                name  = "SMS_KEY"
                value = "VALOR_DO_SEU_ENV"
            }

            ports {
                container_port = 3000
            }
        }
    }

    traffic {
        type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
        percent = 100
    }
}

resource "google_cloud_run_service_iam_binding" "cloudrun_service_iam_bindingg" {
    project  = var.project_id
    location = var.region
    service  = google_cloud_run_v2_service.cloudrun_private_api.name
    role     = "roles/run.invoker"
    members  = [ 
        "allUsers"
    ]
}