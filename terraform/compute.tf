# 1. Application Load Balancer (ALB) - Đặt ở Public Subnet
resource "aws_lb" "web_alb" {
  name               = "MyWeb-ALB"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

# 2. Target Group (Nhóm đích) chứa cấu hình Sticky Session cho ứng dụng Stateful
resource "aws_lb_target_group" "web_tg" {
  name     = "MyWeb-TargetGroup"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main_vpc.id

  # Cấu hình kiểm tra sức khỏe của Node.js
  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 10
  }

  # BẬT STICKY SESSION (Dành riêng cho app dùng EJS/Session Memory)
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400 # Session giữ trong 1 ngày (tính bằng giây)
    enabled         = true
  }
}

# 3. Listener (Lắng nghe request và chuyển vào Target Group)
resource "aws_lb_listener" "web_listener" {
  load_balancer_arn = aws_lb.web_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_tg.arn
  }
}

# 4. Launch Template (Bản thiết kế mẫu cho các máy ảo)
resource "aws_launch_template" "web_template" {
  name_prefix   = "NodeJS-Template-"
  image_id      = "ami-0a56f8447277affd8"
  instance_type = "t2.micro" # Gói Free Tier

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2_profile.arn
  }

  network_interfaces {
    security_groups = [aws_security_group.ec2_sg.id]
  }

  # Script chạy tự động khi máy tính vừa bật lên (Có thể cập nhật sau)
  user_data = filebase64("${path.module}/init.sh") 
}

# 5. Auto Scaling Group (Quản lý số lượng máy ảo) - Đặt ở Private Subnet
resource "aws_autoscaling_group" "web_asg" {
  name                = "MyWeb-ASG"
  desired_capacity    = 2 # Chạy mặc định 2 máy
  max_size            = 4 # Tối đa giãn ra 4 máy khi đông
  min_size            = 1 # Ít nhất phải có 1 máy sống
  target_group_arns   = [aws_lb_target_group.web_tg.arn]
  vpc_zone_identifier = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  launch_template {
    id      = aws_launch_template.web_template.id
    version = "$Latest"
  }
}
