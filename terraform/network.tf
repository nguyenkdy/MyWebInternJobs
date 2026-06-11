# 1. Tạo VPC (Mạng riêng ảo)
resource "aws_vpc" "main_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "MyWeb-VPC"
  }
}

# 2. Tạo 2 Public Subnet (Dành cho Load Balancer và NAT Gateway)
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-southeast-1a"
  map_public_ip_on_launch = true

  tags = { Name = "Public-Subnet-1" }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "ap-southeast-1b"
  map_public_ip_on_launch = true

  tags = { Name = "Public-Subnet-2" }
}

# 3. Tạo 2 Private Subnet (Kín hoàn toàn, dành cho EC2 chạy Node.js)
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main_vpc.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "ap-southeast-1a"

  tags = { Name = "Private-Subnet-1" }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main_vpc.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "ap-southeast-1b"

  tags = { Name = "Private-Subnet-2" }
}

# 4. Internet Gateway (Cửa ngõ kết nối Internet cho Public Subnet)
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main_vpc.id

  tags = { Name = "MyWeb-IGW" }
}

# 5. NAT Gateway + Elastic IP (Cửa ngõ cho Private Subnet ra ngoài gọi MongoDB)
resource "aws_eip" "nat_eip" {
  domain = "vpc"
  
  tags = { Name = "NAT-Elastic-IP" }
}

resource "aws_nat_gateway" "nat_gw" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_1.id # Đặt NAT ở Public Subnet
  depends_on    = [aws_internet_gateway.igw]

  tags = { Name = "MyWeb-NAT" }
}

# 6. Route Tables (Bảng định tuyến)
# Bảng định tuyến cho Public (Trỏ ra Internet Gateway)
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "Public-RouteTable" }
}

# Bảng định tuyến cho Private (Trỏ ra NAT Gateway)
resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gw.id
  }
  tags = { Name = "Private-RouteTable" }
}

# 7. Gắn Route Table vào Subnet tương ứng
resource "aws_route_table_association" "public_1_assoc" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public_rt.id
}
resource "aws_route_table_association" "public_2_assoc" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public_rt.id
}
resource "aws_route_table_association" "private_1_assoc" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private_rt.id
}
resource "aws_route_table_association" "private_2_assoc" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private_rt.id
}
