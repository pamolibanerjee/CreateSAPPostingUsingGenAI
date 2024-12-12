/* Helper file to process and store vector embeddings in HANA Cloud */

const cds = require('@sap/cds');
const { INSERT, DELETE, SELECT } = cds.ql;
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const fs = require('fs');
const { Files } = cds.entities;
//const { PDFDocument } = require('pdf-lib');
const { PDFLoader } = require('langchain/document_loaders/fs/pdf');
const { Readable, PassThrough } = require("stream");
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const express = require('express');
const fileReader = require('filereader');
const app = express();




// Helper method to convert embeddings to buffer for insertion
let array2VectorBuffer = (data) => {
  const sizeFloat = 4;
  const sizeDimensions = 4;
  const bufferSize = data.length * sizeFloat + sizeDimensions;

  const buffer = Buffer.allocUnsafe(bufferSize);
  // write size into buffer
  buffer.writeUInt32LE(data.length, 0);
  data.forEach((value, index) => {
    buffer.writeFloatLE(value, index * sizeFloat + sizeDimensions);
  });
  return buffer;
};

// Helper method to delete file if it already exists
const deleteIfExists = (filePath) => {
  try {
    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          console.log('File does not exist');
        } else {
          console.error('Error deleting file:', err);
        }
      } else {
        console.log('File deleted successfully');
      }
    });
  } catch (unlinkErr) {
    console.error('Error occurred while attempting to delete file:', unlinkErr);
  }
};

function formatPayload(llmInput) {
  var llmInput = llmInput;

  const glAccount = [
    {
      "to_SupplierInvoiceItemGLAcct	": "user",
      //          "content": "Please extract the information from the pdf document" + pdfDoc + "and convert into JSON Format",
      "content":
        [
          {
            "type": "text",
            "text": `Extract from the image attached the finance relevant data /n
                      Structure the data and create the payload for this NON PO Invoice suitable for SAP API https://api.sap.com/api/API_SUPPLIERINVOICE_PROCESS_SRV/overview. /n
                      Take into consideration the below mentions: 
                      1. If the company code identified is Gen AI SRL then the code for SAP is GNAI .
                      2.If Vendor identified is IT Equipment SRL then the Vendor code in SAP is 50040 .
                      3.If Tax Code is 0% then Tax code is V0 .
                      4. If somewhere in the document the responsible person is Mihai Preda, then the cost center used in the posting for the cost line item is 10101100 . 
                      5 If the line item description is IT Equipment the the GL account for the cost line item is 65301001 . 
                      6. If the mentioned due date is less than 30 days to the posting date, then set the Payment terms field for SAP to 0001, in case not, put NT30. /n
                       Can you put this into a payload  and map the fields to the above API format. Don't say any other words, just do what is asked.`  },
          {
            "type": "image_url",
            "image_url": {
              "url": image_url//image_url_value //image_url_value //
            }
          }
        ]
    }

  ]



  return formattedPayload;
}


module.exports = function () {

  this.on('process_document', async (req) => {
    try {

      const { uuid } = req.data;
      const db = await cds.connect.to('db');
      const host = req.headers.origin;
      const { Files, DocumentChunk } = this.entities;
      const capllmplugin = await cds.connect.to("cap-llm-plugin");
      let textChunkEntries = [];
      //      const embeddingModelName = "text-embedding-ada-002";
      const s4opS06 = await cds.connect.to('API_SUPPLIERINVOICE_PROCESS_SRV');

      // Check if document exists
      const isDocumentPresent = await SELECT.from(Files).where({ ID: uuid });
      if (isDocumentPresent.length == 0) {
        throw new Error(`Document with uuid:  ${uuid} not yet persisted in database!`)
      }

      // Load pdf from HANA and create a temp pdf doc
      // const stream = await db.stream(SELECT('content').from(Files, uuid));
      // const stream = await (SELECT('content').from(Files, uuid));
      const imgContent = await db.run(SELECT('content').from(Files).where({ ID: uuid }));
      //  const stream = await db.stream(SELECT('content').from(Files).where({ ID: uuid }));
      const fileName = await (SELECT('fileName').from(Files).where({ ID: uuid }));
      const fileNameString = fileName[0].fileName;
      const tempDocLocation = __dirname + `/${fileName[0].fileName}`;
      console.log("***********************************************************************************************\n");
      console.log(`Received the request to process the document ${fileNameString} and store it into SAP HANA Cloud!\n`);

      //Convert to Base64 and send to API
      const stream = new PassThrough;
      const chunks = [];

      stream.on('data', chunk => {
        chunks.push(chunk)
      })

      imgContent[0].content.pipe(stream);

      // // Wait for the stream to finish
      await new Promise((resolve, reject) => {
        stream.on('end', () => {
          resolve();
        });
      });


      // Convert Image array to Base 64
      const base64data = Buffer.concat(chunks).toString('base64');

      //Construct URL
      var image_url = 'data:image/png;base64,' + base64data;

      //Use LLM GPT 4o to feed the document and generate a JSON out of it

      // const image_url_content = host + `/odata/v4/process-document/Files(` + uuid + `)/content`;
      //     const image_url_value = host + `/odata/v4/process-document/Files(` + uuid + `)/$value`;
      //    const image_url_value = 'https://fa93f79etrial-dev-create-so-from-chat-srv.cfapps.us10-001.hana.ondemand.com' + `/odata/v4/process-document/Files(` + uuid + `)/$value`
      //set the modeName you want
      const chatModelName = "gpt-4o";
      console.log(`Leveraing the following LLMs \n Chat Model:  gpt-4o`);
      //      const memoryContext = await storeRetrieveMessages(conversationId, messageId, message_time, user_id, user_query, Conversation, Message, chatModelName);

      //Obtain the model configs configured in package.json
      const chatModelConfig = cds.env.requires["gen-ai-hub"][chatModelName];
      console.log("Getting the Chat respose response from the CAP LLM Plugin!");

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
                "text": `Extract from the image attached the finance relevant data
                      Structure the data and create the payload for this NON PO Invoice suitable for SAP API https://api.sap.com/api/API_SUPPLIERINVOICE_PROCESS_SRV/overview. /n
                      Take into consideration the below mentions: 
                      1. If the company code identified is Gen AI SRL then the code for SAP is GNAI .
                      2.If Vendor identified is IT Equipment SRL then the Vendor code in SAP is 50040 .
                      3.If Tax Code is 0% then Tax code is V0 .
                      4. If somewhere in the document the responsible person is Mihai Preda, then the cost center used in the posting for the cost line item is 10101100 . 
                      5 If the line item description is IT Equipment the the GL account for the cost line item is 65301001 . 
                      6. If the mentioned due date is less than 30 days to the posting date, then set the Payment terms field for SAP to 0001, in case not, put NT30. /n
                      7. For the DocumentDate and PostingDate the output in the payload should be 2024-11-06T00:00:00 
                      Can you put the resulting content into this 
                       {
                            "CompanyCode": "",
                            "DocumentDate": "",
                            "PostingDate": "",
                            "DocumentCurrency": "",
                            "InvoiceGrossAmount": "",
                            "InvoicingParty": "",
                            "PaymentTerms": "",
                            "AccountingDocumentType": "KR",
                            "to_SupplierInvoiceItemGLAcct": {
                              "results": [
                                {
                                  "SupplierInvoiceItem": "",
                                  "GLAccount": "",
                                  "TaxCode": "",
                                  "DocumentCurrency":"",
                                  "SupplierInvoiceItemAmount": "",
                                  "DebitCreditCode": "",
                                  "CostCenter":""
                                }
                              ]
                            },
                            "to_SupplierInvoiceTax": {
                              "results": [
                                {
                                  "TaxCode": "",
                                  "DocumentCurrency":"",
                                  "TaxAmount": ""
                                }
                              ]
                            }

                          } format and map the values to the fields? 
                           Don't say any other words, just do what is asked. 
                           Remove any ${ticks} or ${json} . `
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": image_url
                }
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

      //Do an executeHttpRequest call to consume the api

      const httpResponse = await executeHttpRequest({ destinationName: 'GENERATIVE_AI_HUB' },
        {
          url: '/v2/inference/deployments/d03c85df13ec9a7a/chat/completions?api-version=2023-05-15',
          method: 'post',
          data: payload,
          headers: { 'AI-Resource-Group': 'default' }
        },
        { fetchCsrfToken: false }

      );

      const entitySupplierInv = s4opS06.entities.A_SupplierInvoice;
      const postData = JSON.parse(httpResponse.data.choices[0].message.content);



      try {
        const InvoicePostRes = await s4opS06.send({
          method: 'POST',
          path: '/A_SupplierInvoice',
          data: postData,
        })

        const output = "Supplier Invoice " + InvoicePostRes.SupplierInvoice + " created for year " + InvoicePostRes.FiscalYear
        return output;

      } catch (error) {
        console.log(error.message)
      }

    }
    catch (error) {
      // Handle any errors that occur during the execution
      console.log('Error while Processing Image', error.message);
      throw error;
    }
    return "Embeddings stored successfully!";

  })


  // this.on('deleteEmbeddings', async () => {
  //   try {
  //     // Delete any previous records in the table
  //     const { DocumentChunk } = this.entities;
  //     await DELETE.from(DocumentChunk);
  //     return "Success!"
  //   }
  //   catch (error) {
  //     // Handle any errors that occur during the execution
  //     console.log('Error while deleting the embeddings content in db:', error);
  //     throw error;
  //   }
  // })


}