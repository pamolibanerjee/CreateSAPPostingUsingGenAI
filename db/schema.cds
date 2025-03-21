namespace sap.socreate.demo;

using {
    cuid,
    managed
} from '@sap/cds/common';

entity Conversation {

    key cID : UUID not null;
    userID: String;
    creation_time: Timestamp;
    last_update_time: Timestamp;
    title: String;
    json_data: String;
    to_messages: Composition of many Message on to_messages.cID = $self;
}

entity Message {

    key cID: Association to Conversation;
    key mID: UUID not null;
    role: String;
    content: LargeString;
    creation_time: Timestamp;
    json_data: String;
}

// entity DocumentChunk
// {
//     text_chunk: LargeString;
//     metadata_column: LargeString;
//     embedding: Vector(1536);
// }


entity Files: cuid, managed{
    @Core.MediaType: mediaType 
    @Core.ContentDisposition.Filename: fileName
    @Core.ContentDisposition.Type: 'inline'
    content: LargeBinary;
    @Core.IsMediaType: true
    mediaType: String;
    fileName: String;
    size: String;
    jsonContent : String;
    url: String
}

