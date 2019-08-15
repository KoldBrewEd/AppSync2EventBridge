"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("@aws-cdk/core");
const aws_appsync_1 = require("@aws-cdk/aws-appsync");
const aws_iam_1 = require("@aws-cdk/aws-iam");
const aws_events_1 = require("@aws-cdk/aws-events");
const lambda = require("@aws-cdk/aws-lambda");
const targets = require("@aws-cdk/aws-events-targets");
class AppSyncCdkStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const appSync2EventBridgeGraphQLApi = new aws_appsync_1.CfnGraphQLApi(this, "AppSync2EventBridgeApi", {
            name: "appsync2eventBridge-api",
            authenticationType: "API_KEY"
        });
        new aws_appsync_1.CfnApiKey(this, "AppSync2EventBridgeApiKey", {
            apiId: appSync2EventBridgeGraphQLApi.attrApiId
        });
        const apiSchema = new aws_appsync_1.CfnGraphQLSchema(this, "ItemsSchema", {
            apiId: appSync2EventBridgeGraphQLApi.attrApiId,
            definition: `type Event {
        result: String
      }
      
      type Mutation {
        putEvent(event: String!): Event
      }
      
      type Query {
        getEvent: Event
      }
      
      schema {
        query: Query
        mutation: Mutation
      }`
        });
        const appsyncEventBridgeRole = new aws_iam_1.Role(this, "AppSyncEventBridgeRole", {
            assumedBy: new aws_iam_1.ServicePrincipal("appsync.amazonaws.com")
        });
        appsyncEventBridgeRole.addToPolicy(new aws_iam_1.PolicyStatement({
            resources: ["*"],
            actions: ["events:Put*"]
        }));
        const dataSource = new aws_appsync_1.CfnDataSource(this, "ItemsDataSource", {
            apiId: appSync2EventBridgeGraphQLApi.attrApiId,
            name: "EventBridgeDataSource",
            type: "HTTP",
            httpConfig: {
                authorizationConfig: {
                    authorizationType: "AWS_IAM",
                    awsIamConfig: {
                        signingRegion: this.region,
                        signingServiceName: "events"
                    }
                },
                endpoint: "https://events." + this.region + ".amazonaws.com/"
            },
            serviceRoleArn: appsyncEventBridgeRole.roleArn
        });
        const putEventResolver = new aws_appsync_1.CfnResolver(this, "PutEventMutationResolver", {
            apiId: appSync2EventBridgeGraphQLApi.attrApiId,
            typeName: "Mutation",
            fieldName: "putEvent",
            dataSourceName: dataSource.name,
            requestMappingTemplate: `{
        "version": "2018-05-29",
        "method": "POST",
        "resourcePath": "/",
        "params": {
          "headers": {
            "content-type": "application/x-amz-json-1.1",
            "x-amz-target":"AWSEvents.PutEvents"
          },
          "body": {
            "Entries":[ 
              {
                "Source":"appsync",
                "EventBusName": "default",
                "Detail":"{ \\\"event\\\": \\\"$ctx.arguments.event\\\"}",
                "DetailType":"Event Bridge via GraphQL"
               }
            ]
          }
        }
      }`,
            responseMappingTemplate: `## Raise a GraphQL field error in case of a datasource invocation error
      #if($ctx.error)
        $util.error($ctx.error.message, $ctx.error.type)
      #end
      ## if the response status code is not 200, then return an error. Else return the body **
      #if($ctx.result.statusCode == 200)
          ## If response is 200, return the body.
          {
            "result": "$util.parseJson($ctx.result.body)"
          }
      #else
          ## If response is not 200, append the response to error block.
          $utils.appendError($ctx.result.body, $ctx.result.statusCode)
      #end`
        });
        putEventResolver.addDependsOn(apiSchema);
        const echoLambda = new lambda.Function(this, "echoFunction", {
            code: lambda.Code.fromInline("exports.handler = (event, context) => { console.log(event); context.succeed(event); }"),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_8_10
        });
        const rule = new aws_events_1.Rule(this, "AppSyncEventBridgeRle", {
            eventPattern: {
                source: ["appsync"]
            }
        });
        rule.addTarget(new targets.LambdaFunction(echoLambda));
    }
}
exports.AppSyncCdkStack = AppSyncCdkStack;
const app = new cdk.App();
new AppSyncCdkStack(app, "AppSyncEventBridge");
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUFzQztBQUN0QyxzREFNOEI7QUFDOUIsOENBQTJFO0FBQzNFLG9EQUEyQztBQUMzQyw4Q0FBK0M7QUFDL0MsdURBQXdEO0FBRXhELE1BQWEsZUFBZ0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM1QyxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSwyQkFBYSxDQUNyRCxJQUFJLEVBQ0osd0JBQXdCLEVBQ3hCO1lBQ0UsSUFBSSxFQUFFLHlCQUF5QjtZQUMvQixrQkFBa0IsRUFBRSxTQUFTO1NBQzlCLENBQ0YsQ0FBQztRQUVGLElBQUksdUJBQVMsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUU7WUFDL0MsS0FBSyxFQUFFLDZCQUE2QixDQUFDLFNBQVM7U0FDL0MsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSw4QkFBZ0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQzFELEtBQUssRUFBRSw2QkFBNkIsQ0FBQyxTQUFTO1lBQzlDLFVBQVUsRUFBRTs7Ozs7Ozs7Ozs7Ozs7O1FBZVY7U0FDSCxDQUFDLENBQUM7UUFFSCxNQUFNLHNCQUFzQixHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUN0RSxTQUFTLEVBQUUsSUFBSSwwQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQztTQUN6RCxDQUFDLENBQUM7UUFFSCxzQkFBc0IsQ0FBQyxXQUFXLENBQ2hDLElBQUkseUJBQWUsQ0FBQztZQUNsQixTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDaEIsT0FBTyxFQUFFLENBQUMsYUFBYSxDQUFDO1NBQ3pCLENBQUMsQ0FDSCxDQUFDO1FBRUYsTUFBTSxVQUFVLEdBQUcsSUFBSSwyQkFBYSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUM1RCxLQUFLLEVBQUUsNkJBQTZCLENBQUMsU0FBUztZQUM5QyxJQUFJLEVBQUUsdUJBQXVCO1lBQzdCLElBQUksRUFBRSxNQUFNO1lBQ1osVUFBVSxFQUFFO2dCQUNWLG1CQUFtQixFQUFFO29CQUNuQixpQkFBaUIsRUFBRSxTQUFTO29CQUM1QixZQUFZLEVBQUU7d0JBQ1osYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO3dCQUMxQixrQkFBa0IsRUFBRSxRQUFRO3FCQUM3QjtpQkFDRjtnQkFDRCxRQUFRLEVBQUUsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxpQkFBaUI7YUFDOUQ7WUFDRCxjQUFjLEVBQUUsc0JBQXNCLENBQUMsT0FBTztTQUMvQyxDQUFDLENBQUM7UUFFSCxNQUFNLGdCQUFnQixHQUFHLElBQUkseUJBQVcsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDekUsS0FBSyxFQUFFLDZCQUE2QixDQUFDLFNBQVM7WUFDOUMsUUFBUSxFQUFFLFVBQVU7WUFDcEIsU0FBUyxFQUFFLFVBQVU7WUFDckIsY0FBYyxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQy9CLHNCQUFzQixFQUFFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztRQW9CdEI7WUFDRix1QkFBdUIsRUFBRTs7Ozs7Ozs7Ozs7OztXQWFwQjtTQUNOLENBQUMsQ0FBQztRQUNILGdCQUFnQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV6QyxNQUFNLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUMzRCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQzFCLHVGQUF1RixDQUN4RjtZQUNELE9BQU8sRUFBRSxlQUFlO1lBQ3hCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQUcsSUFBSSxpQkFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUNuRCxZQUFZLEVBQUU7Z0JBQ1osTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDO2FBQ3BCO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0NBQ0Y7QUEzSEQsMENBMkhDO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDMUIsSUFBSSxlQUFlLENBQUMsR0FBRyxFQUFFLG9CQUFvQixDQUFDLENBQUM7QUFDL0MsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNkayA9IHJlcXVpcmUoXCJAYXdzLWNkay9jb3JlXCIpO1xuaW1wb3J0IHtcbiAgQ2ZuR3JhcGhRTEFwaSxcbiAgQ2ZuQXBpS2V5LFxuICBDZm5HcmFwaFFMU2NoZW1hLFxuICBDZm5EYXRhU291cmNlLFxuICBDZm5SZXNvbHZlclxufSBmcm9tIFwiQGF3cy1jZGsvYXdzLWFwcHN5bmNcIjtcbmltcG9ydCB7IFJvbGUsIFNlcnZpY2VQcmluY2lwYWwsIFBvbGljeVN0YXRlbWVudCB9IGZyb20gXCJAYXdzLWNkay9hd3MtaWFtXCI7XG5pbXBvcnQgeyBSdWxlIH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1ldmVudHNcIjtcbmltcG9ydCBsYW1iZGEgPSByZXF1aXJlKFwiQGF3cy1jZGsvYXdzLWxhbWJkYVwiKTtcbmltcG9ydCB0YXJnZXRzID0gcmVxdWlyZShcIkBhd3MtY2RrL2F3cy1ldmVudHMtdGFyZ2V0c1wiKTtcblxuZXhwb3J0IGNsYXNzIEFwcFN5bmNDZGtTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBhcHBTeW5jMkV2ZW50QnJpZGdlR3JhcGhRTEFwaSA9IG5ldyBDZm5HcmFwaFFMQXBpKFxuICAgICAgdGhpcyxcbiAgICAgIFwiQXBwU3luYzJFdmVudEJyaWRnZUFwaVwiLFxuICAgICAge1xuICAgICAgICBuYW1lOiBcImFwcHN5bmMyZXZlbnRCcmlkZ2UtYXBpXCIsXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uVHlwZTogXCJBUElfS0VZXCJcbiAgICAgIH1cbiAgICApO1xuXG4gICAgbmV3IENmbkFwaUtleSh0aGlzLCBcIkFwcFN5bmMyRXZlbnRCcmlkZ2VBcGlLZXlcIiwge1xuICAgICAgYXBpSWQ6IGFwcFN5bmMyRXZlbnRCcmlkZ2VHcmFwaFFMQXBpLmF0dHJBcGlJZFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXBpU2NoZW1hID0gbmV3IENmbkdyYXBoUUxTY2hlbWEodGhpcywgXCJJdGVtc1NjaGVtYVwiLCB7XG4gICAgICBhcGlJZDogYXBwU3luYzJFdmVudEJyaWRnZUdyYXBoUUxBcGkuYXR0ckFwaUlkLFxuICAgICAgZGVmaW5pdGlvbjogYHR5cGUgRXZlbnQge1xuICAgICAgICByZXN1bHQ6IFN0cmluZ1xuICAgICAgfVxuICAgICAgXG4gICAgICB0eXBlIE11dGF0aW9uIHtcbiAgICAgICAgcHV0RXZlbnQoZXZlbnQ6IFN0cmluZyEpOiBFdmVudFxuICAgICAgfVxuICAgICAgXG4gICAgICB0eXBlIFF1ZXJ5IHtcbiAgICAgICAgZ2V0RXZlbnQ6IEV2ZW50XG4gICAgICB9XG4gICAgICBcbiAgICAgIHNjaGVtYSB7XG4gICAgICAgIHF1ZXJ5OiBRdWVyeVxuICAgICAgICBtdXRhdGlvbjogTXV0YXRpb25cbiAgICAgIH1gXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcHBzeW5jRXZlbnRCcmlkZ2VSb2xlID0gbmV3IFJvbGUodGhpcywgXCJBcHBTeW5jRXZlbnRCcmlkZ2VSb2xlXCIsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoXCJhcHBzeW5jLmFtYXpvbmF3cy5jb21cIilcbiAgICB9KTtcblxuICAgIGFwcHN5bmNFdmVudEJyaWRnZVJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgICBhY3Rpb25zOiBbXCJldmVudHM6UHV0KlwiXVxuICAgICAgfSlcbiAgICApO1xuXG4gICAgY29uc3QgZGF0YVNvdXJjZSA9IG5ldyBDZm5EYXRhU291cmNlKHRoaXMsIFwiSXRlbXNEYXRhU291cmNlXCIsIHtcbiAgICAgIGFwaUlkOiBhcHBTeW5jMkV2ZW50QnJpZGdlR3JhcGhRTEFwaS5hdHRyQXBpSWQsXG4gICAgICBuYW1lOiBcIkV2ZW50QnJpZGdlRGF0YVNvdXJjZVwiLFxuICAgICAgdHlwZTogXCJIVFRQXCIsXG4gICAgICBodHRwQ29uZmlnOiB7XG4gICAgICAgIGF1dGhvcml6YXRpb25Db25maWc6IHtcbiAgICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogXCJBV1NfSUFNXCIsXG4gICAgICAgICAgYXdzSWFtQ29uZmlnOiB7XG4gICAgICAgICAgICBzaWduaW5nUmVnaW9uOiB0aGlzLnJlZ2lvbixcbiAgICAgICAgICAgIHNpZ25pbmdTZXJ2aWNlTmFtZTogXCJldmVudHNcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZW5kcG9pbnQ6IFwiaHR0cHM6Ly9ldmVudHMuXCIgKyB0aGlzLnJlZ2lvbiArIFwiLmFtYXpvbmF3cy5jb20vXCJcbiAgICAgIH0sXG4gICAgICBzZXJ2aWNlUm9sZUFybjogYXBwc3luY0V2ZW50QnJpZGdlUm9sZS5yb2xlQXJuXG4gICAgfSk7XG5cbiAgICBjb25zdCBwdXRFdmVudFJlc29sdmVyID0gbmV3IENmblJlc29sdmVyKHRoaXMsIFwiUHV0RXZlbnRNdXRhdGlvblJlc29sdmVyXCIsIHtcbiAgICAgIGFwaUlkOiBhcHBTeW5jMkV2ZW50QnJpZGdlR3JhcGhRTEFwaS5hdHRyQXBpSWQsXG4gICAgICB0eXBlTmFtZTogXCJNdXRhdGlvblwiLFxuICAgICAgZmllbGROYW1lOiBcInB1dEV2ZW50XCIsXG4gICAgICBkYXRhU291cmNlTmFtZTogZGF0YVNvdXJjZS5uYW1lLFxuICAgICAgcmVxdWVzdE1hcHBpbmdUZW1wbGF0ZTogYHtcbiAgICAgICAgXCJ2ZXJzaW9uXCI6IFwiMjAxOC0wNS0yOVwiLFxuICAgICAgICBcIm1ldGhvZFwiOiBcIlBPU1RcIixcbiAgICAgICAgXCJyZXNvdXJjZVBhdGhcIjogXCIvXCIsXG4gICAgICAgIFwicGFyYW1zXCI6IHtcbiAgICAgICAgICBcImhlYWRlcnNcIjoge1xuICAgICAgICAgICAgXCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi94LWFtei1qc29uLTEuMVwiLFxuICAgICAgICAgICAgXCJ4LWFtei10YXJnZXRcIjpcIkFXU0V2ZW50cy5QdXRFdmVudHNcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJib2R5XCI6IHtcbiAgICAgICAgICAgIFwiRW50cmllc1wiOlsgXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIlNvdXJjZVwiOlwiYXBwc3luY1wiLFxuICAgICAgICAgICAgICAgIFwiRXZlbnRCdXNOYW1lXCI6IFwiZGVmYXVsdFwiLFxuICAgICAgICAgICAgICAgIFwiRGV0YWlsXCI6XCJ7IFxcXFxcXFwiZXZlbnRcXFxcXFxcIjogXFxcXFxcXCIkY3R4LmFyZ3VtZW50cy5ldmVudFxcXFxcXFwifVwiLFxuICAgICAgICAgICAgICAgIFwiRGV0YWlsVHlwZVwiOlwiRXZlbnQgQnJpZGdlIHZpYSBHcmFwaFFMXCJcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1gLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGAjIyBSYWlzZSBhIEdyYXBoUUwgZmllbGQgZXJyb3IgaW4gY2FzZSBvZiBhIGRhdGFzb3VyY2UgaW52b2NhdGlvbiBlcnJvclxuICAgICAgI2lmKCRjdHguZXJyb3IpXG4gICAgICAgICR1dGlsLmVycm9yKCRjdHguZXJyb3IubWVzc2FnZSwgJGN0eC5lcnJvci50eXBlKVxuICAgICAgI2VuZFxuICAgICAgIyMgaWYgdGhlIHJlc3BvbnNlIHN0YXR1cyBjb2RlIGlzIG5vdCAyMDAsIHRoZW4gcmV0dXJuIGFuIGVycm9yLiBFbHNlIHJldHVybiB0aGUgYm9keSAqKlxuICAgICAgI2lmKCRjdHgucmVzdWx0LnN0YXR1c0NvZGUgPT0gMjAwKVxuICAgICAgICAgICMjIElmIHJlc3BvbnNlIGlzIDIwMCwgcmV0dXJuIHRoZSBib2R5LlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwicmVzdWx0XCI6IFwiJHV0aWwucGFyc2VKc29uKCRjdHgucmVzdWx0LmJvZHkpXCJcbiAgICAgICAgICB9XG4gICAgICAjZWxzZVxuICAgICAgICAgICMjIElmIHJlc3BvbnNlIGlzIG5vdCAyMDAsIGFwcGVuZCB0aGUgcmVzcG9uc2UgdG8gZXJyb3IgYmxvY2suXG4gICAgICAgICAgJHV0aWxzLmFwcGVuZEVycm9yKCRjdHgucmVzdWx0LmJvZHksICRjdHgucmVzdWx0LnN0YXR1c0NvZGUpXG4gICAgICAjZW5kYFxuICAgIH0pO1xuICAgIHB1dEV2ZW50UmVzb2x2ZXIuYWRkRGVwZW5kc09uKGFwaVNjaGVtYSk7XG5cbiAgICBjb25zdCBlY2hvTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcImVjaG9GdW5jdGlvblwiLCB7XG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKFxuICAgICAgICBcImV4cG9ydHMuaGFuZGxlciA9IChldmVudCwgY29udGV4dCkgPT4geyBjb25zb2xlLmxvZyhldmVudCk7IGNvbnRleHQuc3VjY2VlZChldmVudCk7IH1cIlxuICAgICAgKSxcbiAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzhfMTBcbiAgICB9KTtcblxuICAgIGNvbnN0IHJ1bGUgPSBuZXcgUnVsZSh0aGlzLCBcIkFwcFN5bmNFdmVudEJyaWRnZVJsZVwiLCB7XG4gICAgICBldmVudFBhdHRlcm46IHtcbiAgICAgICAgc291cmNlOiBbXCJhcHBzeW5jXCJdXG4gICAgICB9XG4gICAgfSk7XG4gICAgcnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oZWNob0xhbWJkYSkpO1xuICB9XG59XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5uZXcgQXBwU3luY0Nka1N0YWNrKGFwcCwgXCJBcHBTeW5jRXZlbnRCcmlkZ2VcIik7XG5hcHAuc3ludGgoKTtcbiJdfQ==