pipeline {
    agent any
    environment {
        DOCKER_IMAGE = 'khanhduy05/myweb'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        KUBECONFIG = '/var/lib/jenkins/.kube/config'
    }
    stages {
        stage('1. Checkout Code') {
            steps { checkout scm }
        }
        stage('2. Build Docker Image') {
            steps {
                sh 'docker build -t ${DOCKER_IMAGE}:${IMAGE_TAG} -t ${DOCKER_IMAGE}:latest .'
            }
        }
        stage('3. Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                    sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                    sh "docker push ${DOCKER_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${DOCKER_IMAGE}:latest"
                }
            }
        }
        stage('4. Deploy to AKS') {
            steps {
                sh "sed -i 's|image: khanhduy05/myweb:latest|image: khanhduy05/myweb:${IMAGE_TAG}|g' k8s/deployment.yaml"
                sh 'kubectl apply -f k8s/configmap.yaml'
                sh 'kubectl apply -f k8s/deployment.yaml'
                sh 'kubectl rollout restart deployment myweb-deployment'
            }
        }
    }
}
