terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Sử dụng profile default của IAM user bạn đã cấu hình trên máy
provider "aws" {
  region  = "ap-southeast-1"
  profile = "default" 
}
