# 1. Security Group cho Load Balancer (Cho phép Internet truy cập)
resource "aws_security_group" "alb_sg" {
  name        = "ALB-Security-Group"
  description = "Allow HTTP traffic from internet"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. Security Group cho các máy ảo EC2 chạy Node.js (Kín, chỉ nhận từ ALB)
resource "aws_security_group" "ec2_sg" {
  name        = "EC2-NodeJS-Security-Group"
  description = "Allow traffic only from ALB"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    description     = "Traffic from ALB"
    from_port       = 3000 # Giả sử Node.js của bạn chạy port 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id] # Chỉ nhận từ ALB SG
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # Cho phép gọi ra ngoài (MongoDB, S3) qua NAT
  }
}
