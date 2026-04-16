variable "prefix" {
  type        = string
  description = "A prefix to be added to all resource names. Usually the Git repository name."
}

variable "project_id" {
  type        = string
  description = "The ID of the project in which to provision resources."
}

variable "region" {
  type        = string
  description = "The region in wich to provision resources."
}

variable "env" {
  type        = string
  description = "Short version of the environment in which Terraform is running."
}