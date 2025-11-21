pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        IMAGE_NAME = 'jkweil125/wmthis-front'
        IMAGE_TAG = "${BUILD_NUMBER}"
        DEPLOYMENT_NAME = 'wmthis-frontend'
        KUBE_NAMESPACE = 'default' // 필요 시 변경
    }

    stages {
        stage('Git Clone') {
            steps {
                git branch: 'main', url: 'https://github.com/beyond-sw-camp/be12-fin-5verdose-WMTHIS-FE'
            }
        }

        stage('Check Branch') {
            when {
                expression {
                    return env.GIT_BRANCH == 'origin/main' || env.BRANCH_NAME == 'main'
                }
            }
            steps {
                echo "✅ Branch is main — proceeding with frontend build."
            }
        }

        stage('Install & Build (Node)') {
            when {
                expression {
                    return env.GIT_BRANCH == 'origin/main' || env.BRANCH_NAME == 'main'
                }
            }
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }

        stage('Docker Build & Push') {
            when {
                expression {
                    return env.GIT_BRANCH == 'origin/main' || env.BRANCH_NAME == 'main'
                }
            }
            steps {
                script {
                    docker.build("${IMAGE_NAME}:${IMAGE_TAG}")
                    withDockerRegistry([credentialsId: 'wmthis']) {
                        docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push()
                    }
                }
            }
        }

                stage('Deploy to Kubernetes') {
            when {
                expression {
                    return env.GIT_BRANCH == 'origin/main' || env.BRANCH_NAME == 'main'
                }
            }
            steps {
                script {
                    sh """
                    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${DEPLOYMENT_NAME}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: wmthis-frontend
  template:
    metadata:
      labels:
        app: wmthis-frontend
    spec:
      containers:
        - name: frontend
          image: ${IMAGE_NAME}:${IMAGE_TAG}
          ports:
            - containerPort: 80
          envFrom:
            - configMapRef:
                name: wmthis-config
EOF
                    """
                }
            }
        }

    }
}
