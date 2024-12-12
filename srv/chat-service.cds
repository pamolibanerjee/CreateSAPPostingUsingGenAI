using {sap.socreate.demo as db} from '../db/schema';

service ChatService @(requires: 'authenticated-user') {
//service ChatService {

    entity Conversation @(restrict: [{
        grant: [
            'READ',
            'WRITE',
            'DELETE'
        ],
        where: 'userID = $user'
    }])            as projection on db.Conversation;

//    entity Conversation as projection on db.Conversation;

    entity Message as projection on db.Message;

    // type RagResponse_AdditionalContents {

    //     score       : String;
    //     pageContent : String;
    // }

    type ChatResponse {
        role               : String;
        content            : String;
        messageTime        : String;
//        additionalContents : array of RagResponse_AdditionalContents;
    }

    action  getChatResponse(conversationId : String, 
                                         messageId : String, 
                                         message_time : Timestamp, 
                                         user_id : String, 
                                         user_query : String,
                                         json_data  : String) 
    returns ChatResponse;
    function deleteChatData()                                                                                                                 returns String;
}
