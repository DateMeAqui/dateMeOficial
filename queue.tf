# =============================================================================
# DATA SOURCES & LOCALS
# =============================================================================

locals {
  cloudrun_url = "https://${google_cloud_run_v2_service.cloudrun_private_api.name}-${data.google_project.current.number}.${var.region}.run.app"
  
  # Esta conta é quem "carimba" a mensagem com o atributo de origem
  pubsub_service_account = "service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# =============================================================================
# 1. RECURSO: REPORTED POSTS (MODERAÇÃO)
# =============================================================================

resource "google_pubsub_topic" "topic_reporting_reported_posts_queue" {
  name    = "date-me-topic-reporting-reported-posts-queue"
  project = var.project_id
}

resource "google_pubsub_topic" "topic_reporting_reported_posts_dlq" {
  name    = "reporting_reported_post_dlq"
  project = var.project_id
}

# resource "google_pubsub_subscription" "subscription_reporting_reported_posts_queue" {
#   name                       = "date_subscription_reporting_reported_posts_queue"
#   project                    = var.project_id
#   topic                      = google_pubsub_topic.topic_reporting_reported_posts_queue.id
#   ack_deadline_seconds       = 600
#   message_retention_duration = "604800s"

#   push_config {
#     push_endpoint = "${local.cloudrun_url}/v1/reporting-reported-posts-queue"
#   }

#   dead_letter_policy {
#     dead_letter_topic     = google_pubsub_topic.topic_reporting_reported_posts_dlq.id
#     max_delivery_attempts = 5
#   }

#   retry_policy {
#     minimum_backoff = "10s"
#     maximum_backoff = "300s"
#   }

#   expiration_policy { ttl = "" }
#   depends_on        = [google_cloud_run_v2_service.cloudrun_private_api]
# }

resource "google_pubsub_subscription" "subscription_reporting_reported_posts_n8n" {
  name                 = "date_subscription_reporting_reported_posts_n8n"
  project              = var.project_id
  topic                = google_pubsub_topic.topic_reporting_reported_posts_queue.id
  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "https://streptococcal-ingeniously-keena.ngrok-free.dev/webhook-test/1dcd872e-274d-4d9b-9dfd-50dd1830a4f0"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.topic_reporting_reported_posts_dlq.id
    max_delivery_attempts = 5
  }

  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "subscription_reporting_reported_posts_dlq" {
  name              = "subscription-reporting-reported-posts-dlq"
  project           = var.project_id
  topic             = google_pubsub_topic.topic_reporting_reported_posts_dlq.id
  expiration_policy { ttl = "" }
}

# =============================================================================
# 2. RECURSO: REPORTING REPORTR RESOLVED
# =============================================================================

resource "google_pubsub_topic" "topic_reporting_reported_posts_resolved_queue" {
  name    = "date-me-topic-reporting-reported-posts-resolved-queue"
  project = var.project_id
}

resource "google_pubsub_topic" "topic_reporting_reported_posts_resolved_dlq" {
  name    = "reporting_reported_posts_resolved_dlq"
  project = var.project_id
}

resource "google_pubsub_subscription" "subscription_reporting_reported_posts_resolved_queue" {
  name                 = "date_subscription_reporting_reported_posts_resolved_queue"
  project              = var.project_id
  topic                = google_pubsub_topic.topic_reporting_reported_posts_resolved_queue.id
  ack_deadline_seconds = 600

  push_config { push_endpoint = "${local.cloudrun_url}/v1/reporting-reported-posts-resolved" }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.topic_reporting_reported_posts_resolved_dlq.id
    max_delivery_attempts = 5
  }

  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "subscription_reporting_reported_posts_resolved_dlq" {
  name              = "subscription-reporting-reported-posts-resolved-dlq"
  project           = var.project_id
  topic             = google_pubsub_topic.topic_reporting_reported_posts_resolved_dlq.id
  expiration_policy { ttl = "" }
}

# Subscription para development/local via zrok
resource "google_pubsub_subscription" "subscription_reporting_reported_posts_resolved_zrok" {
  name                 = "date_subscription_reporting_reported_posts_resolved_zrok"
  project              = var.project_id
  topic                = google_pubsub_topic.topic_reporting_reported_posts_resolved_queue.id
  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "https://vcbfx3bq2n1h.share.zrok.io/v1/reporting-reported-posts-resolved"
  }

  expiration_policy { ttl = "" }
}


# =============================================================================
# 4. RECURSO: FILA UM
# =============================================================================

resource "google_pubsub_topic" "topic_fila_um" {
  name    = "date-me-topic-fila-um-queue"
  project = var.project_id
}

resource "google_pubsub_topic" "topic_fila_um_dlq" {
  name    = "fila_um_dlq"
  project = var.project_id
}

# resource "google_pubsub_subscription" "subscription_fila_um_queue" {
#   name                 = "date_subscription_fila_um_queue"
#   project              = var.project_id
#   topic                = google_pubsub_topic.topic_fila_um.id
#   ack_deadline_seconds = 600

#   push_config { push_endpoint = "${local.cloudrun_url}/v1/fila-um" }

#   dead_letter_policy {
#     dead_letter_topic     = google_pubsub_topic.topic_fila_um_dlq.id
#     max_delivery_attempts = 5
#   }

#   expiration_policy { ttl = "" }
# }

resource "google_pubsub_subscription" "subscription_fila_um_n8n" {
  name                 = "date_subscription_fila_um_n8n"
  project              = var.project_id
  topic                = google_pubsub_topic.topic_fila_um.id
  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "https://streptococcal-ingeniously-keena.ngrok-free.dev/webhook/4cb44f11-ee27-464d-9125-d3062be72c3a"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.topic_fila_um_dlq.id
    max_delivery_attempts = 5
  }

  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "subscription_fila_um_dlq" {
  name              = "subscription-fila-um-dlq"
  project           = var.project_id
  topic             = google_pubsub_topic.topic_fila_um_dlq.id
  ack_deadline_seconds = 600
  expiration_policy { ttl = "" }
}

# =============================================================================
# 5. RECURSO: FILA DOIS
# =============================================================================

resource "google_pubsub_topic" "topic_fila_dois" {
  name    = "date-me-topic-fila-dois-queue"
  project = var.project_id
}

resource "google_pubsub_topic" "topic_fila_dois_dlq" {
  name    = "fila_dois_dlq"
  project = var.project_id
}

# resource "google_pubsub_subscription" "subscription_fila_dois_queue" {
#   name                 = "date_subscription_fila_dois_queue"
#   project              = var.project_id
#   topic                = google_pubsub_topic.topic_fila_dois.id
#   ack_deadline_seconds = 600

#   push_config { push_endpoint = "${local.cloudrun_url}/v1/fila-dois" }

#   dead_letter_policy {
#     dead_letter_topic     = google_pubsub_topic.topic_fila_dois_dlq.id
#     max_delivery_attempts = 5
#   }

#   expiration_policy { ttl = "" }
# }

resource "google_pubsub_subscription" "subscription_fila_dois_n8n" {
  name                 = "date_subscription_fila_dois_n8n"
  project              = var.project_id
  topic                = google_pubsub_topic.topic_fila_dois.id
  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "https://streptococcal-ingeniously-keena.ngrok-free.dev/webhook/3368bbc5-fa6e-4044-959c-e7704959aaa5"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.topic_fila_dois_dlq.id
    max_delivery_attempts = 5
  }

  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "subscription_fila_dois_dlq" {
  name              = "subscription-fila-dois-dlq"
  project           = var.project_id
  topic             = google_pubsub_topic.topic_fila_dois_dlq.id
  ack_deadline_seconds = 600
  expiration_policy { ttl = "" }
}

# =============================================================================
# 6. RECURSO: FILA TRES
# =============================================================================

resource "google_pubsub_topic" "topic_fila_tres" {
  name    = "date-me-topic-fila-tres-queue"
  project = var.project_id
}

resource "google_pubsub_topic" "topic_fila_tres_dlq" {
  name    = "fila_tres_dlq"
  project = var.project_id
}

# resource "google_pubsub_subscription" "subscription_fila_tres_queue" {
#   name                 = "date_subscription_fila_tres_queue"
#   project              = var.project_id
#   topic                = google_pubsub_topic.topic_fila_tres.id
#   ack_deadline_seconds = 600

#   push_config { push_endpoint = "${local.cloudrun_url}/v1/fila-tres" }

#   dead_letter_policy {
#     dead_letter_topic     = google_pubsub_topic.topic_fila_tres_dlq.id
#     max_delivery_attempts = 5
#   }

#   expiration_policy { ttl = "" }
# }

resource "google_pubsub_subscription" "subscription_fila_tres_n8n" {
  name                 = "date_subscription_fila_tres_n8n"
  project              = var.project_id
  topic                = google_pubsub_topic.topic_fila_tres.id
  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "https://streptococcal-ingeniously-keena.ngrok-free.dev/webhook/67c74ef5-4996-47c5-a933-2c6e35cf6def"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.topic_fila_tres_dlq.id
    max_delivery_attempts = 5
  }

  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "subscription_fila_tres_dlq" {
  name              = "subscription-fila-tres-dlq"
  project           = var.project_id
  topic             = google_pubsub_topic.topic_fila_tres_dlq.id
  ack_deadline_seconds = 600
  expiration_policy { ttl = "" }
}

# =============================================================================
# 7. RECURSO: FILA QUATRO
# =============================================================================

resource "google_pubsub_topic" "topic_fila_quatro" {
  name    = "date-me-topic-fila-quatro-queue"
  project = var.project_id
}

resource "google_pubsub_topic" "topic_fila_quatro_dlq" {
  name    = "fila_quatro_dlq"
  project = var.project_id
}

# resource "google_pubsub_subscription" "subscription_fila_quatro_queue" {
#   name                 = "date_subscription_fila_quatro_queue"
#   project              = var.project_id
#   topic                = google_pubsub_topic.topic_fila_quatro.id
#   ack_deadline_seconds = 600

#   push_config { push_endpoint = "${local.cloudrun_url}/v1/fila-quatro" }

#   dead_letter_policy {
#     dead_letter_topic     = google_pubsub_topic.topic_fila_quatro_dlq.id
#     max_delivery_attempts = 5
#   }

#   expiration_policy { ttl = "" }
# }

resource "google_pubsub_subscription" "subscription_fila_quatro_n8n" {
  name                 = "date_subscription_fila_quatro_n8n"
  project              = var.project_id
  topic                = google_pubsub_topic.topic_fila_quatro.id
  ack_deadline_seconds = 600

  push_config {
    push_endpoint = "https://streptococcal-ingeniously-keena.ngrok-free.dev/webhook/cee22f17-e8d7-4478-9db4-80c96ad01121"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.topic_fila_quatro_dlq.id
    max_delivery_attempts = 5
  }

  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "subscription_fila_quatro_dlq" {
  name              = "subscription-fila-quatro-dlq"
  project           = var.project_id
  topic             = google_pubsub_topic.topic_fila_quatro_dlq.id
  ack_deadline_seconds = 600
  expiration_policy { ttl = "" }
}

# =============================================================================
# PERMISSÕES IAM: FUNDAMENTAL PARA O RETORNO DA REQUEST PULL
# =============================================================================

# Permite que o serviço Pub/Sub escreva no tópico de DLQ
resource "google_pubsub_topic_iam_member" "pubsub_dlq_publisher" {
  for_each = toset([
    google_pubsub_topic.topic_reporting_reported_posts_dlq.name,
    google_pubsub_topic.topic_reporting_reported_posts_resolved_dlq.name,
    google_pubsub_topic.topic_fila_um.name,
    google_pubsub_topic.topic_fila_dois.name,
    google_pubsub_topic.topic_fila_tres.name,
    google_pubsub_topic.topic_fila_quatro.name,
  ])
  project = var.project_id
  topic   = each.value
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${local.pubsub_service_account}"
}

# Permite que o serviço Pub/Sub gerencie as mensagens que falham.
# AO ADICIONAR AS SUBSCRIPTIONS AQUI, O GOOGLE ATIVA O ATRIBUTO NO JSON DE RETORNO.
resource "google_pubsub_subscription_iam_member" "pubsub_subscriber_dlq_handler" {
  for_each = toset([
    # google_pubsub_subscription.subscription_reporting_reported_posts_queue.name,
    google_pubsub_subscription.subscription_reporting_reported_posts_n8n.name,
    google_pubsub_subscription.subscription_reporting_reported_posts_resolved_queue.name,
    # google_pubsub_subscription.subscription_fila_um_queue.name,
    google_pubsub_subscription.subscription_fila_um_n8n.name,
    google_pubsub_subscription.subscription_fila_dois_n8n.name,
    google_pubsub_subscription.subscription_fila_tres_n8n.name,
    google_pubsub_subscription.subscription_fila_quatro_n8n.name
  ])
  project      = var.project_id
  subscription = each.value
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${local.pubsub_service_account}"
}

# Permite que o n8n faça a request ":pull" e receba os dados
resource "google_pubsub_subscription_iam_member" "n8n_access" {
  for_each = toset([
    google_pubsub_subscription.subscription_reporting_reported_posts_dlq.name,
    google_pubsub_subscription.subscription_reporting_reported_posts_n8n.name,
    google_pubsub_subscription.subscription_reporting_reported_posts_resolved_dlq.name,
    # google_pubsub_subscription.subscription_fila_um_dlq.name,
    google_pubsub_subscription.subscription_fila_um_n8n.name,
    google_pubsub_subscription.subscription_fila_dois_n8n.name,
    google_pubsub_subscription.subscription_fila_tres_n8n.name,
    google_pubsub_subscription.subscription_fila_quatro_n8n.name
  ])
  project      = var.project_id
  subscription = each.value
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.service_account.email}"
}

# Permissão para o n8n ler logs do Cloud Logging
resource "google_project_iam_member" "n8n_logging_viewer" {
  project = var.project_id
  role    = "roles/logging.viewer" # Permite visualizar logs
  member  = "serviceAccount:${google_service_account.service_account.email}"
}