import { Stack } from 'aws-cdk-lib';
import { TableV2, TablePropsV2, AttributeType, Billing } from 'aws-cdk-lib/aws-dynamodb';

interface BaseDynamoDBTableProps extends TablePropsV2 {
    tableName?: string;
}

export class BaseDynamoDBTable extends TableV2 {
    constructor(scope: Stack, id: string, props: BaseDynamoDBTableProps) {
        super(scope, id, {
            ...props,
            billing: Billing.onDemand(),
            partitionKey: {
                name: props.partitionKey?.name || 'defaultPartitionKey',
                type: AttributeType.STRING,
            },
            sortKey: props.sortKey
            ? {
                name: props.sortKey?.name || 'defaultSortKey',
                type: AttributeType.STRING,
            }
            : undefined,
        });
    }
}