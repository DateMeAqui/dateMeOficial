import {PubSub} from '@google-cloud/pubsub';

// https://cloud.google.com/pubsub/docs/reference/libraries#client-libraries-install-nodejs
async function quickstart(
    projectId = 'dateme-474016',
    topicNameOrId = 'report-posts-topic',
    subscriptionName = 'analyze-post-sub'

){
    const pubsub = new PubSub({projectId})

    const [topic] = await pubsub.topic(topicNameOrId).get({autoCreate: true});
    console.log(`Topic ${topic.name} created.`);

    const  [subscription] = await topic.subscription(subscriptionName).get({autoCreate: true});

    subscription.on('message', message => {
        console.log('Received message: ', message.data.toString());
        process.exit(0);
    });

    subscription.on('error', error =>{
        console.log('Received error :', error);
        process.exit(1);
    });

    await topic.publishMessage({data: Buffer.from("mensagem de teste para o agente avaliar !")});

    console.log(`script esperando por 10 segundos`)
    await new Promise(resolve => setTimeout(resolve, 10000));

}

quickstart()

// // https://cloud.google.com/pubsub/docs/samples/pubsub-create-topic?hl=pt_br#pubsub_create_topic-nodejs_typescript


// async function quickstart(
//     projectId = 'dateme-474016',
//     topicNameOrId = 'report-posts-topic',
//     subscriptionName = 'analyze-post-sub'

// ){
//     const pubsub = new PubSub({projectId})

//     const [topic] = await pubsub.createTopic(topicNameOrId);
//     console.log(`Topic ${topic.name} created.`);

//     const  [subscription] = await topic.createSubscription(subscriptionName);

//     subscription.on('message', message => {
//         console.log('Received message: ', message.data.toString());
//         process.exit(0);
//     });

//     subscription.on('error', error =>{
//         console.log('Received error :', error);
//         process.exit(1);
//     });

//     await topic.publishMessage({data: Buffer.from("mensagem de teste para o agente avaliar !")});

//     console.log(`script esperando por 10 segundos`)
//     await new Promise(resolve => setTimeout(resolve, 10000));

// }

// quickstart()