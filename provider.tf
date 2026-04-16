provider "google" {
  project = var.project_id
  region  = "us-central1"
  zone    = "us-central1-a"
}

terraform {
  backend "gcs" {  
  }

  required_version = ">= 1.7.2"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "6.8.0"
    }
  }
}
# https://developer.hashicorp.com/terraform/tutorials/gcp-get-started/google-cloud-platform-build

