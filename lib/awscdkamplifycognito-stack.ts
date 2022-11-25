import * as cdk from '@aws-cdk/core';
import * as cognito from '@aws-cdk/aws-cognito';
import { Construct, Duration } from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';


export class AwscdkamplifycognitoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, 'awscdk-amplify-cognito', {
      signInAliases: { username: true, email: true, preferredUsername:true},
      selfSignUpEnabled: true, //This allows users to sign up themselves instead of by the app's administrators
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailSubject: 'Please verify your email',
        emailBody: 'Hello, this is your account verification code  {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: 'Hello, this is your account verification code  {####}',
      },
      autoVerify: {
        email: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false
        }
      },
      customAttributes: { 'name': new cognito.StringAttribute({ minLen: 3, maxLen: 35, mutable: false })},
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },

    });

    const userId = userPool.userPoolId;

    const userPoolWebClient = new cognito.UserPoolClient(this, 'UserPoolWebClient', {
      userPool,
      generateSecret: false,
      authFlows: { userPassword: true,userSrp:true },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL,cognito.OAuthScope.PHONE,cognito.OAuthScope.PROFILE,cognito.OAuthScope.COGNITO_ADMIN,cognito.OAuthScope.OPENID]
      }
    });

    const clientId = userPoolWebClient.userPoolClientId;
    //Create an API Gateway 
    const api = new apigateway.RestApi(this, 'exampleapi', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS.concat(['x-api-key']),
        allowCredentials: true,
      },
      restApiName: 'exampleApi',
      description: 'Example endpoint',
    });

   

    //Add root resource
    const exampleResource = api.root.addResource('example');
    //this.addCorsOptions(exampleResource);

    //Configure Lambda execution environment
    // code that will be loaded from "lambda" directory we created earlier
    // file is "example" that we created earlier, function is "handler" in the same file
    const exampleLambda = new lambda.Function(this, 'ExampleHandler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'example.handler'
    });

    //Integrate lambda function with apigateway
    const exampleIntegration = new apigateway.LambdaIntegration(
      exampleLambda
    )

    //Create API Authorizer
    const exampleAuth = new apigateway.CognitoUserPoolsAuthorizer(this, 'exampleAuth', {
      cognitoUserPools: [userPool]
    });

    //add authorizer to the method
    exampleResource.addMethod('GET', exampleIntegration, {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: exampleAuth,


    });
  
    new cdk.CfnOutput(this, 'UserPoolId', { value: userId });

    new cdk.CfnOutput(this, 'UserPoolWebClientId', { value: clientId });

    new cdk.CfnOutput(this, 'UserSignupURL', { value: userPoolWebClient.node.addr });

    new cdk.CfnOutput(this, 'API Gateway URL', { value: api.url });
  }

}
