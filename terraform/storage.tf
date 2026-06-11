# 1. Tạo S3 Bucket lưu trữ Avatar (Sử dụng prefix vì tên S3 bắt buộc phải duy nhất toàn cầu)
resource "aws_s3_bucket" "avatar_bucket" {
  bucket_prefix = "myweb-avatars-"
  force_destroy = true # Cho phép dọn sạch bucket khi chạy lệnh hủy để làm lab không bị kẹt
}

# 2. Kích hoạt tính năng chặn hoàn toàn truy cập công khai (Block Public Access)
resource "aws_s3_bucket_public_access_block" "s3_block" {
  bucket = aws_s3_bucket.avatar_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. Khởi tạo cấu hình bảo mật CloudFront Origin Access Control (OAC)
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "MyWeb-S3-OAC"
  description                       = "OAC for Avatar S3 Bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 4. Tạo mạng phân phối toàn cầu CloudFront trỏ về S3 Bucket trên
resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name              = aws_s3_bucket.avatar_bucket.bucket_regional_domain_name
    origin_id                = "S3-AvatarOrigin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  enabled         = true
  is_ipv6_enabled = true

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-AvatarOrigin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https" # Ép từ HTTP sang HTTPS
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "MyWeb-CloudFront"
  }
}

# 5. Tự động áp Policy lên S3 Bucket để mở quyền ĐỌC duy nhất cho CloudFront phân phối ảnh
resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.avatar_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.avatar_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "${aws_cloudfront_distribution.s3_distribution.arn}"
          }
        }
      }
    ]
  })
}
