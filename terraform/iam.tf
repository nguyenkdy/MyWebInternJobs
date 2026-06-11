# 1. Tạo IAM Role cho máy ảo EC2
resource "aws_iam_role" "ec2_s3_role" {
  name = "MyWeb-EC2-S3-Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# 2. Tạo IAM Policy định nghĩa các quyền tương tác với S3 (Chỉ cho phép xử lý Avatar)
resource "aws_iam_policy" "s3_access_policy" {
  name        = "MyWeb-S3-Access-Policy"
  description = "Allow EC2 to upload and manage avatars in S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.avatar_bucket.arn}",
          "${aws_s3_bucket.avatar_bucket.arn}/*"
        ]
      }
    ]
  })
}

# 3. Gắn chặt Policy vào Role vừa tạo
resource "aws_iam_role_policy_attachment" "s3_attach" {
  role       = aws_iam_role.ec2_s3_role.name
  policy_arn = aws_iam_policy.s3_access_policy.arn
}

# 4. Tạo Instance Profile (Cầu nối để đưa Role này gắn vào cấu hình máy ảo)
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "MyWeb-EC2-Instance-Profile"
  role = aws_iam_role.ec2_s3_role.name
}
