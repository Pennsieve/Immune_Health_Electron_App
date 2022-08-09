export const DATASET_ACTIVITY_ALL_CATEGORIES = {
  value: null,
  label: 'All Categories',
}

export const DATASET_ACTIVITY_ALL_CONTRIBUTORS = {
  value: null,
  label: 'All Contributors',
}

export const DATASET_ACTIVITY_DATE_RANGE_30 = {
  value: 30,
  label: 'Last 30 Days',
}
<<<<<<< HEAD
=======

export const referenceTypeOptions = Object.freeze([
{
  value: 'IsDerivedFrom',
  label: 'Derived from'
},
{
  value: 'IsDescribedBy',
  label: 'Described by'
},
{
  value: 'Describes',
  label: 'Describes'
},
{
  value: 'Documents',
  label: 'Documents'
},
{
  value: 'IsDocumentedBy',
  label: 'Is Documented by'
},
{
  value: 'IsMetadataFor',
  label: 'Is Metadata for'
},
{
  value: 'IsReferencedBy',
  label: 'Is Referenced by'
},
{
  value: 'IsRequiredBy',
  label: 'Is Required by'
},
{
  value: 'IsSourceOf',
  label: 'Is Source of'
},
{
  value: 'IsSupplementedBy',
  label: 'Is Supplemented by'
},
{
  value: 'IsSupplementTo',
  label: 'Is Supplement to'
},
{
  value: 'IsOriginalFormOf',
  label: 'Is Original Form of'
},
{
  value: 'IsVariantFormOf',
  label: 'Is Variant Form of'
},
{
  value: 'References',
  label: 'References'
},
{
  value: 'Requires',
  label: 'Requires'
}
])

export const ChangelogMessage = Object.freeze({
  CREATE_PACKAGE: {
    plural: 'files uploaded',
    singular: 'File uploaded'
  },

  DELETE_PACKAGE: {
    plural: 'files deleted',
    singular: 'File deleted'
  },

  MOVE_PACKAGE: {
    plural: 'files moved',
    singular: 'File moved'
  },

  RENAME_PACKAGE: {
    plural: 'files renamed',
    singular: 'File renamed'
  },

  UPDATE: {
    plural: 'dataset metadata changes',
    singular: 'Dataset metadata changed'
  },

  UPDATE_METADATA: {
    plural: 'dataset metadata changes',
    singular: 'Dataset metadata changed'
  },

  CREATE_MODEL: {
    plural: 'models created',
    singular: 'Model created'
  },
  UPDATE_MODEL: {
    plural: 'models changed',
    singular: 'Model changed'
  },

  UPDATE_MODEL_PROPERTY: {
    plural: 'model properties changed',
    singular: 'Model property changed'
  },

  CREATE_MODEL_PROPERTY: {
    plural: 'model properties created',
    singular: 'Model property created'
  },

  DELETE_MODEL_PROPERTY: {
    plural: 'model properties deleted',
    singular: 'Model property deleted'
  },

  DELETE_MODEL: {
    plural: 'models deleted',
    singular: 'Model deleted'
  },
  CREATE_RECORD: {
    plural: 'metadata records created',
    singular: 'Metadata record created'
  },
  UPDATE_RECORD: {
    plural: 'metadata records changed',
    singular: 'Metadata record changed'
  },
  DELETE_RECORD: {
    plural: 'records deleted',
    singular: 'Record deleted'
  },
  CREATE_DATASET: {
    singular: 'Dataset created'
  },
  CUSTOM_EVENT: {
    plural: 'custom events triggered',
    singular: 'custom event triggered'
  },

  PUBLISHING: {
    REQUEST_PUBLICATION: 'Dataset submitted for publication',
    REQUEST_EMBARGO: 'Dataset submitted for embargo',
    ACCEPT_PUBLICATION: 'Dataset accepted for publication',
    ACCEPT_REVISION: 'Dataset accepted for revision',
    ACCEPT_EMBARGO: 'Dataset accepted for embargo',
    REQUEST_REVISION: 'Dataset submitted for revision',
    REJECT_PUBLICATION: 'Dataset publishing request rejected',
    REJECT_REVISION: 'Dataset revision request rejected',
    REJECT_EMBARGO: 'Dataset embargo request rejected',
    REJECT_REMOVAL: 'Dataset removal request rejected',
    CANCEL_PUBLICATION: 'Dataset publishing request canceled',
    CANCEL_REVISION: 'Dataset revision request canceled',
    CANCEL_EMBARGO: 'Dataset embargo request canceled',
    CANCEL_REMOVAL: 'Dataset removal request canceled',
    RELEASE_EMBARGO: 'Dataset embargo released'
  },

  METADATA_UPDATE: {
    UPDATE_NAME: {
      plural: 'Name changes',
      singular: 'Name changed'
    },

    UPDATE_DESCRIPTION: {
      plural: 'Subtitle changes',
      singular: 'Subtitle changed'
    },

    UPDATE_LICENSE: {
      plural: 'License changes',
      singular: 'License changed to [LICENSE]'
    },

    CREATE_README: {
      plural: 'Overview added',
      singular: 'Overview added'
    },

    UPDATE_README: {
      plural: 'Overview changes',
      singular: 'Overview changed'
    },

    CREATE_BANNER_IMAGE: {
      plural: 'Banner images uploaded',
      singular: 'Banner image uploaded'
    },

    UPDATE_BANNER_IMAGE: {
      plural: 'Banner images replaced',
      singular: 'Banner image replaced'
    },

    ADD_EXTERNAL_PUBLICATION: {
      plural: 'References added',
      singular: 'Reference [DOI] added'
    },

    REMOVE_EXTERNAL_PUBLICATION: {
      plural: 'References removed',
      singular: 'Reference [DOI] removed'
    },

    ADD_TAG: {
      plural: 'Tags added',
      singular: 'Tag [NAME] added'
    },

    REMOVE_TAG: {
      plural: 'Tags removed',
      singular: 'Tag [NAME] removed'
    },

    ADD_CONTRIBUTOR: {
      plural: '[NUMBER] contributors added',
      singular: '[FULLNAME] added as contributor'
    },

    REMOVE_CONTRIBUTOR: {
      plural: 'Contributors removed',
      singular: 'Contributor [FULLNAME] removed'
    },

    ADD_COLLECTION: {
      plural: 'Collections added',
      singular: 'Collection [NAME] added'
    },

    REMOVE_COLLECTION: {
      plural: 'Collections removed',
      singular: 'Collection [NAME] removed'
    },

    UPDATE_IGNORE_FILES: {
      plural: 'Files will be ignored during publishing',
      singular: '[NUMBER] files will be ignored during publishing'
    },

    UPDATE_STATUS: {
      plural: 'Status changes',
      singular: 'Status changed from [OLDNAME] to [NEWNAME]'
    }
  }
})


export const PublicationStatus = Object.freeze({
  DRAFT: 'draft',
  REQUESTED: 'requested',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
  FAILED: 'failed',
  COMPLETED: 'completed',
})
>>>>>>> integrate-uploads-page
