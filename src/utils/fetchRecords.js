import axios from 'axios'
import { clone, propOr, isEmpty } from "ramda"
import { getFormatter } from '@/mixins/data-type/utils';
import { v1 } from 'uuid';

const IMMUNE_HEALTH_DATASET_ID = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc'
// pennsieve endpoint for retreiving all the records pertaining to a study when no filter is applied
// pennsieve endpoint for retrieving a list of filtered records
const GET_FILTERED_METADATA_RECORDS_ENDPOINT = 'https://api.pennsieve.io/models/v2/organizations/655/search/records'

const REQUEST_HEADER = (token) => {
  return { 
    headers: { Authorization: `Bearer ${token}`}
  }
}

// construct the query that is to be used in the body of the post request to retrieve the filtered records
const getQuery = async (model, filters, token) => {
  const searchFilters = []
  let query = {
    model: model,
    datasets: [2] // dataset id for Penn Immune Health dataset
  }
  const relevantModelsUrl = `https://api.pennsieve.io/models/v2/organizations/655/autocomplete/models?relatedTo=${model}`
  const relevantModels = await axios.get(relevantModelsUrl, REQUEST_HEADER(token)).then(({data}) => {
    return data.models.map((model) => { return model['name'] })
  })
  
  filters.forEach(filter => {
    /**
     * Only add filter if the target exists
     * This is to allow searches with empty filters
     * We're counting on the validation steps before
     * this to ensure the filters are complete
     */
    if (filter.target && !filter.isInvalid) {
      // Only add the filter if it is relevant to the model the query is being requested for
      if (relevantModels.includes(filter.target)) {
        searchFilters.push({
          model: filter.target,
          property: filter.property,
          operator: filter.operation,
          value: filter.value
        })
      }
    }
  })
  query.filters = searchFilters

  return query
}

const getStudyName = function(study) {
  const studyValues = propOr([], 'values', study)
  if (isEmpty(studyValues)) {
    return ''
  }
  return propOr('', 'value', studyValues[0])
}

/**
 * fetches the filtered patients records related to the selected study
 * @param {string} selectedStudyId - retreived from state.selectedStudy
 * @param {[Object]} filters - retreived from state.searchModalSearch.filters
 * @param {string} token - retrieved from state.apiKey
 * @param {int} limit - the upper limit of the list of records returned
 * @param {int} offset - the offset of the list of records returned
 */
export const fetchFilteredPatientsMetadataRelatedToStudy = async (selectedStudy, filters, token, limit, offset) => {
  // return the records related to the selected study with the filters applied
  const filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`

  // filter the returned records by the selected study
  const modifiedFilters = clone(filters)
  modifiedFilters.push({
    id: v1(),
    isInvalid: false,
    lockTarget: true,
    operation: "=",
    operationLabel: "equals",
    operators: [
      {
        label: 'equals',
        value: '='
      },
      {
        label: 'does not equal',
        value: '<>'
      },
      {
        label: 'starts with',
        value: 'STARTS WITH'
      },
    ],
    property: "sstudyid",
    propertyLabel: "sstudyid",
    propertyType: {format: null, type: "String"},
    target: "study",
    targetLabel: "study",
    type: "model",
    value: getStudyName(selectedStudy)
  })
  const patientsQuery = await getQuery('patient', modifiedFilters, token)

  return await axios.post(filteredRecordsUrl, patientsQuery, REQUEST_HEADER(token)).then(response => {
    return handleV2RecordsResponse(propOr([], 'data', response))
  })
}

/**
 * fetches the filtered visits records related to the selected study
 * @param {string} selectedStudyId - retreived from state.selectedStudy
 * @param {[Object]} filters - retreived from state.searchModalSearch.filters
 * @param {string} token - retrieved from state.apiKey
 * @param {int} limit - the upper limit of the list of records returned
 * @param {int} offset - the offset of the list of records returned
 */
 export const fetchFilteredVisitsMetadataRelatedToStudy = async (selectedStudy, filters, token, limit, offset) => {
  // return the records related to the selected study with the filters applied
  const filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`

  // filter the returned records by the selected study
  const modifiedFilters = clone(filters)
  modifiedFilters.push({
    id: v1(),
    isInvalid: false,
    lockTarget: true,
    operation: "=",
    operationLabel: "equals",
    operators: [
      {
        label: 'equals',
        value: '='
      },
      {
        label: 'does not equal',
        value: '<>'
      },
      {
        label: 'starts with',
        value: 'STARTS WITH'
      },
    ],
    property: "sstudyid",
    propertyLabel: "sstudyid",
    propertyType: {format: null, type: "String"},
    target: "study",
    targetLabel: "study",
    type: "model",
    value: getStudyName(selectedStudy)
  })
  const visitsQuery = await getQuery('visits', modifiedFilters, token)

  return await axios.post(filteredRecordsUrl, visitsQuery, REQUEST_HEADER(token)).then(response => {
    return handleV2RecordsResponse(propOr([], 'data', response))
  })
}

/**
 * fetches the filtered samples records related to the selected study
 * @param {string} selectedStudyId - retreived from state.selectedStudy
 * @param {[Object]} filters - retreived from state.searchModalSearch.filters
 * @param {string} token - retrieved from state.apiKey
 * @param {int} limit - the upper limit of the list of records returned
 * @param {int} offset - the offset of the list of records returned
 */
 export const fetchFilteredSamplesMetadataRelatedToStudy = async (selectedStudy, filters, token, limit, offset) => {
  // return the records related to the selected study with the filters applied
  const filteredRecordsUrl = `${GET_FILTERED_METADATA_RECORDS_ENDPOINT}?limit=${limit}&offset=${offset}`

  // filter the returned records by the selected study
  const modifiedFilters = clone(filters)
  modifiedFilters.push({
    id: v1(),
    isInvalid: false,
    lockTarget: true,
    operation: "=",
    operationLabel: "equals",
    operators: [
      {
        label: 'equals',
        value: '='
      },
      {
        label: 'does not equal',
        value: '<>'
      },
      {
        label: 'starts with',
        value: 'STARTS WITH'
      },
    ],
    property: "sstudyid",
    propertyLabel: "sstudyid",
    propertyType: {format: null, type: "String"},
    target: "study",
    targetLabel: "study",
    type: "model",
    value: getStudyName(selectedStudy)
  })
  const samplesQuery = await getQuery('samples', modifiedFilters, token)

  return await axios.post(filteredRecordsUrl, samplesQuery, REQUEST_HEADER(token)).then(response => {
    return handleV2RecordsResponse(propOr([], 'data', response))
  })
}


/**
 * Handles response from v2 records search endpoint
 */
const handleV2RecordsResponse = (v2ResponseData) => {
  const recordModels = propOr([], 'models', v2ResponseData)
  const records = propOr([], 'records', v2ResponseData)
  const totalCount = v2ResponseData.totalCount
  let recordHeadings = []

  /**
   * a nested map of Model ID -> Property Name -> Data Type
   * for example:
   * {
   *   <some-model-uuid>: {
   *      name: {
   *        format: ...,
   *        type: ...
   *      },
   *      was_good: {
   *        format: ...,
   *        type: ...
   *      }
   *   },
   *   <another-model-uuid>: { ... }
   * }
   */
  const modelPropertyDataTypeMap = recordModels.reduce(
    (modelPropertyMapResult, model) => {
      modelPropertyMapResult[model.id] = model.properties.reduce(
        (propertyDtMapResult, property) => {
          const { dataType, name } = property;
          if (name) {
            propertyDtMapResult[name] = dataType
            // @todo: mutating this.recordHeadings in the reduce is yucky.  Probably better to just loop separately.
            const nameExists = recordHeadings.find(h => h.name === name)
            if (!nameExists) recordHeadings.push(property)
          }
          return propertyDtMapResult
        },
        {}
      )
      return modelPropertyMapResult
    },
    {}
  )

  // now to get record data
  const formattedRecords = records.map(record => {
    const values = propOr('', 'values', record)
    const recordId = propOr('', 'id', record)

    /**
     * Format the values of the record
     */
    const formattedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => {
        const dataType = modelPropertyDataTypeMap[record.modelId][key]
        const formatter = getFormatter( dataType )

        const formattedValue = Array.isArray(value)
          ? value.map(v => formatter(v)).join(", ")
          : formatter(value)

        return [key, formattedValue]
      })
    )

    return {
      recordId: recordId,
      datasetId: IMMUNE_HEALTH_DATASET_ID,
      modelId: record.modelId,
      ...formattedValues
    } 
  })

  return {
    headings: recordHeadings,
    records: formattedRecords,
    totalCount: totalCount
  }
}