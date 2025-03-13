/* Main implementation file for handling chat */

const cds = require('@sap/cds');
const { DELETE } = cds.ql;
const { storeRetrieveMessages, storeModelResponse } = require('./memory-helper');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');


// const tableName = 'SAP_TISCE_DEMO_DOCUMENTCHUNK';
// const embeddingColumn = 'EMBEDDING';
// const contentColumn = 'TEXT_CHUNK';

const systemPrompt =
    ` You are an helpful assistant who answers user question based only on the following context enclosed in triple quotes.\n
`;

module.exports = function () {

    this.on('getChatResponse', async (req) => {
        try {
            //request input data
            const { conversationId, messageId, message_time, user_id, user_query } = req.data;
            const { Conversation, Message } = this.entities;
            const s4opS06 = await cds.connect.to('API_SUPPLIERINVOICE_PROCESS_SRV');
            //            const capllmplugin = await cds.connect.to("cap-llm-plugin");
            console.log("***********************************************************************************************\n");
            console.log(`Received the request for the user query : ${user_query}\n`);
            /*
            For this sample use case we show how you can leverage the gpt model. However, you can easily customize this code to use any models supported by CAP LLM Plugin.
            Chat Model:  gpt-4 
            Embedding Model: text-embedding-ada-002
            */

            //set the modeName you want
            const chatModelName = "gpt-4";
            const embeddingModelName = "text-embedding-ada-002";

            console.log("");
            //Optional. handle memory before the RAG LLM call
            const memoryContext = await storeRetrieveMessages(conversationId, messageId, message_time, user_id, user_query, Conversation, Message, chatModelName);

            //Obtain the model configs configured in package.json
            const chatModelConfig = cds.env.requires["gen-ai-hub"][chatModelName];
            const embeddingModelConfig = cds.env.requires["gen-ai-hub"][embeddingModelName];

            //Populate Get call for the User Query
            // Using match with regEx
            let matches = user_query.match(/(\d+)/);

            // Display output if number extracted
            if (matches) {
                const inv = matches[0];
                try {
                    const InvoiceGetRes = await s4opS06.send({
                      method: 'GET',
                      path: `/A_SupplierInvoice(SupplierInvoice='${inv}',FiscalYear='2024')/to_SupplierInvoiceItemGLAcct`,
                    })

                    var apiResponse = JSON.stringify(InvoiceGetRes);
                    let determinationPayload = [{
                        "role": "system",
                        //        "content" : `${systemPrompt}`
                        "content": "You are are helpful assistant"
                      }];
                
                      const ticks = "```";
                      const json = "json";
                      const userQuestion = [
                        {
                          "role": "user",
                          "content":
                            [
                              {
                                "type": "text",
                                "text": `Structure this API response ${apiResponse} into a simple format . 
                                           Remove any ${ticks} or ${json} or empty values.Just do what is asked ,do not say any extra words`
                              }
                            ]
                        }
                      ]
                      determinationPayload.push(...userQuestion);
                      let payload = {
                        "messages": determinationPayload,
                        //        "max_tokens": 100, 
                        "stream": false
                      };

                      const httpResponse = await executeHttpRequest({ destinationName: 'GENERATIVE_AI_HUB' },
                        {
                          url: '/v2/inference/deployments/d03c85df13ec9a7a/chat/completions?api-version=2023-05-15',
                          method: 'post',
                          data: payload,
                          headers: { 'AI-Resource-Group': 'default' }
                        },
                        { fetchCsrfToken: false }
                      );
                      var formattedAPIresponse = httpResponse.data.choices[0].message.content;
            
                  } catch (error) {
                    console.log(error.message)
                  }
            } else
            {
              //Just pass the user question to LLM as is
              let determinationPayload = [{
                "role": "system",
                //        "content" : `${systemPrompt}`
                "content": "You are are helpful assistant"
              }];
        
              const ticks = "```";
              const json = "json";
              const userQuestion = [
                {
                  "role": "user",
                  "content":
                    [
                      {
                        "type": "text",
                        "text": user_query
                      }
                    ]
                }
              ]
              determinationPayload.push(...userQuestion);
              let payload = {
                "messages": determinationPayload,
                //        "max_tokens": 100, 
                "stream": false
              };

              const httpResponse = await executeHttpRequest({ destinationName: 'GENERATIVE_AI_HUB' },
                {
                  url: '/v2/inference/deployments/d03c85df13ec9a7a/chat/completions?api-version=2023-05-15',
                  method: 'post',
                  data: payload,
                  headers: { 'AI-Resource-Group': 'default' }
                },
                { fetchCsrfToken: false }
              );
              var formattedAPIresponse = httpResponse.data.choices[0].message.content;
            }
            //parse the response object according to the respective model for your use case. For instance, lets consider the following three models.
            let chatCompletionResponse = null;

            chatCompletionResponse =
            {
                "role": "assistant",
                "content": formattedAPIresponse //apiResponse
            }

            //Optional. handle memory after the RAG LLM call
            const responseTimestamp = new Date().toISOString();
            await storeModelResponse(conversationId, responseTimestamp, chatCompletionResponse, Message, Conversation);

            //build the response payload for the frontend.
            const response = {
                "role": 'assistant',
                "content": chatCompletionResponse.content,
                "messageTime": responseTimestamp,
                //                "additionalContents": chatRagResponse.additionalContents,
            };

            return response;
        }
        catch (error) {
            // Handle any errors that occur during the execution
            console.log('Error while generating response for user query:', error);
            throw error;
        }
    })


    this.on('deleteChatData', async () => {
        try {
            const { Conversation, Message } = this.entities;
            await DELETE.from(Conversation);
            await DELETE.from(Message);
            return "Success!"
        }
        catch (error) {
            // Handle any errors that occur during the execution
            console.log('Error while deleting the chat content in db:', error);
            throw error;
        }
    })

}