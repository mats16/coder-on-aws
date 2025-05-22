import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface ProvisionerRoleProps extends iam.RoleProps {}

export class ProvisionerRole extends iam.Role {
  /**
   * IAM Role for Coder Provisioner
   */
  constructor(scope: Construct, id: string, props: ProvisionerRoleProps) {
    super(scope, id, props);

    const policy = new iam.Policy(this, "Policy", {
      statements: [
        new iam.PolicyStatement({
          actions: ["ec2:DescribeSubnets", "ec2:DescribeInstanceTypeOfferings"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: [
            "ec2:GetDefaultCreditSpecification",
            "ec2:DescribeIamInstanceProfileAssociations",
            "ec2:DescribeTags",
            "ec2:DescribeInstances",
            "ec2:DescribeInstanceTypes",
            "ec2:CreateTags",
            "ec2:RunInstances",
            "ec2:DescribeInstanceCreditSpecifications",
            "ec2:DescribeImages",
            "ec2:ModifyDefaultCreditSpecification",
            "ec2:DescribeVolumes",
            "ec2:DescribeVolumesModifications",
            "ec2:DescribeInstanceStatus",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: [
            "ec2:DescribeInstanceAttribute",
            "ec2:UnmonitorInstances",
            "ec2:TerminateInstances",
            "ec2:StartInstances",
            "ec2:StopInstances",
            "ec2:DeleteTags",
            "ec2:MonitorInstances",
            "ec2:CreateTags",
            "ec2:RunInstances",
            "ec2:ModifyInstanceAttribute",
            "ec2:ModifyInstanceCreditSpecification",
          ],
          resources: ["arn:aws:ec2:*:*:instance/*"],
          conditions: {
            StringEquals: {
              "aws:ResourceTag/Coder_Provisioned": "true",
            },
          },
        }),
        new iam.PolicyStatement({
          actions: ["ec2:ModifyVolume"],
          resources: ["arn:aws:ec2:*:*:volume/*"],
          conditions: {
            StringEquals: {
              "aws:ResourceTag/Coder_Provisioned": "true",
            },
          },
        }),
      ],
    });

    policy.attachToRole(this);
  }
}
