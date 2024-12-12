using {sap.socreate.demo as db} from '../db/schema';
//using { API_SUPPLIERINVOICE_PROCESS_SRV as apisupplierinv } from './external/API_SUPPLIERINVOICE_PROCESS_SRV';


service process_document @(requires: 'authenticated-user') {
//  service process_document {

  // entity DocumentChunk as
  //   projection on db.DocumentChunk
  //   excluding {
  //     embedding
  //   };
  // @readonly
  // entity SupplierInv as projection on apisupplierinv.A_SupplierInvoice {
        
  //   };

  entity Files @(restrict: [{
    grant: [
      'READ',
      'WRITE',
      'UPDATE',
      'DELETE'
    ],
    where: 'createdBy = $user'
  }])                  as projection on db.Files;

 entity JournalEntry {
        ID : String(12);
        FirstName : String(128);
        LastName : String(128);
        PersonFullName : String(258);
        BusinessPartnerRoleCode : String(6);
        HasUser : Boolean;
    }

 // entity Files as projection on db.Files;

  action process_document(uuid : String) returns String;
//  function deleteEmbeddings()             returns String;

}
