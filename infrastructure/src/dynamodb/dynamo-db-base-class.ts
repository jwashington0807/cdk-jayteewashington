import { Stack } from "aws-cdk-lib";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { BaseDynamoDbTableProps } from "../../models/dynamodb";

export class BaseDynamoDbTable extends TableV2 {
    constructor(scope: Stack, id: string, props: BaseDynamoDbTableProps) {
        super(scope, id, {
            ...props,
            billing: Billing.onDemand(),
            partitionKey: {
                name: props.partitionKey?.name || 'defaultPartitionKey',
                type: AttributeType.STRING
            },
            sortKey: props.sortKey
                ? {
                    name: props.sortKey?.name || 'defaultSortKey',
                    type: AttributeType.STRING
                }
            : undefined
        });
    }
}