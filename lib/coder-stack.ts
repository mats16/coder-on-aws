import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { CoderDatabase } from "./coder-database";
import { ProvisionerRole } from "./coder-provisioner-role";
import { CoderCDN } from "./coder-cdn";

export class CoderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      ipProtocol: ec2.IpProtocol.DUAL_STACK,
      maxAzs: 99,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      restrictDefaultSecurityGroup: false,
    });

    /**
     * PostgreSQL Database
     */
    const db = new CoderDatabase(this, "Database", {
      vpc,
    });

    /**
     * Security Group for coderd
     */
    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      description: "Security Group for coderd",
      allowAllOutbound: true,
      allowAllIpv6Outbound: true,
      vpc,
    });

    // Allow outbound traffic to the database from coderd
    securityGroup.connections.allowToDefaultPort(db.cluster);

    /**
     * Provisioner Role
     */
    const provisionerRole = new ProvisionerRole(this, "ProvisionerRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    /**
     * ECS Cluster
     */
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
    });

    /**
     * ECS Service with ALB (coderd)
     */
    const app = new ApplicationLoadBalancedFargateService(this, "Service", {
      cluster,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      },
      cpu: 2048,
      memoryLimitMiB: 4096,
      desiredCount: 1,
      taskImageOptions: {
        containerName: "coder",
        image: ecs.ContainerImage.fromRegistry("ghcr.io/coder/coder:v2.21.3"),
        containerPort: 8080,
        environment: {
          CODER_PG_CONNECTION_URL: `postgresql://postgres:postgres@${db.cluster.clusterEndpoint.socketAddress}/coder?sslmode=disable`,
          // Authentication
          CODER_DISABLE_PASSWORD_AUTH: "true",
          // Networking
          CODER_HTTP_ADDRESS: "0.0.0.0:8080",
          CODER_PROXY_TRUSTED_HEADERS: "X-Forwarded-For",
          // DERP
          CODER_DERP_CONFIG_URL:
            "https://controlplane.tailscale.com/derpmap/default",
          // Provisioner
          CODER_PROVISIONER_DAEMONS: "3",
        },
        taskRole: provisionerRole,
      },
      securityGroups: [securityGroup],
      assignPublicIp: true,
    });

    app.targetGroup.configureHealthCheck({
      path: "/healthz",
      healthyThresholdCount: 3,
      unhealthyThresholdCount: 2,
      timeout: cdk.Duration.seconds(3),
      interval: cdk.Duration.seconds(5),
      healthyHttpCodes: "200",
    });

    const cdn = new CoderCDN(this, "CDN", {
      loadBalancer: app.loadBalancer,
    });

    // Set the access URL for coderd
    app.taskDefinition.defaultContainer?.addEnvironment(
      "CODER_ACCESS_URL",
      `https://${cdn.distribution.domainName}`,
    );

    // Set the access URL for coderd
    // app.taskDefinition.defaultContainer?.addEnvironment(
    //   "CODER_WILDCARD_ACCESS_URL",
    //   `*.${cdn.distribution.domainName}`,
    // );
  }
}
