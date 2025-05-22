import * as cdk from "aws-cdk-lib";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import { LoadBalancerV2Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { ILoadBalancerV2 } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

interface CoderCDNProps {
  loadBalancer: ILoadBalancerV2;
}

export class CoderCDN extends Construct {
  /**
   * CloudFront Distribution
   */
  public readonly distribution: cf.Distribution;

  /**
   * CDN for Coder (CloudFront)
   */
  constructor(scope: Construct, id: string, props: CoderCDNProps) {
    super(scope, id);

    const loadBalancer = props.loadBalancer;

    /**
     * CloudFront Origin
     */
    const origin = new LoadBalancerV2Origin(loadBalancer, {
      protocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY,
    });

    this.distribution = new cf.Distribution(this, "Distribution", {
      comment: this.node.path + "/Distribution",
      priceClass: cf.PriceClass.PRICE_CLASS_200,
      httpVersion: cf.HttpVersion.HTTP2_AND_3,
      enableIpv6: true,
      defaultBehavior: {
        origin,
        compress: false,
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        cachePolicy: cf.CachePolicy.CACHING_DISABLED,
        originRequestPolicy:
          cf.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    });

    // Add behavior for assets
    this.distribution.addBehavior("assets/*", origin, {
      compress: true,
      allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
      originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    });

    // Add behavior for icons
    this.distribution.addBehavior("icon/*", origin, {
      compress: true,
      allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
      originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    });

    new cdk.CfnOutput(this, "URL", {
      value: `https://${this.distribution.domainName}`,
    });
  }
}
