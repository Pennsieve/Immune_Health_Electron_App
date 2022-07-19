import { getFormatter } from '@/mixins/data-type/utils';
import { propOr } from 'ramda'

/**
 * The structure of the response data returned by the v1 endpoint https://api.pennsieve.io/models/datasets/{datasetId}/concepts/{conceptId}/instances/{instanceId}/relations/{relationsId} 
 * is different than the structure returned by the v2 endpoint https://api.pennsieve.io/models/v2/organizations/{organizationId}/search/records/{params}
 * These methods will format the v1 and v2 response data to match the response structure expected by the records table as well as return the corresponding table headings
 */

/**
 * Handle records response from v1 version of the API
 */
export const handleV1RecordsResponse = (v1ResponseData) => {
  const recordHeadings = getRecordsV1Heading(v1ResponseData)

  const formattedRecords = v1ResponseData.map(record => {
    const formattedValues = Object.fromEntries(
      record[1].values.map(property => {
        // debugger
        const dataType = typeof property.dataType === 'object'
          ? property.dataType
          : { type: property.dataType }
        const formatter = getFormatter( dataType )

        const formattedValue = Array.isArray(property.value)
          ? property.value.map(v => formatter(v)).join(", ")
          : formatter(property.value)

        return [ property.name, formattedValue ]
      })
    )

    return {
        recordId: record[1].id,
        datasetId: 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc',
        modelId: record[1].type, // TODO: Convert type to its corresponding id using an enum
        ...formattedValues
    }
  })

  return {
    headings: recordHeadings,
    records: formattedRecords
  }
}

/**
 * Handles response from v2 records search endpoint
 */
export const handleV2RecordsResponse = (v2ResponseData) => {
  const recordModels = propOr([], 'models', v2ResponseData)
  const records = propOr([], 'records', v2ResponseData)
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
      datasetId: 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc',
      modelId: record.modelId,
      ...formattedValues
    } 
  })

  return {
    headings: recordHeadings,
    records: formattedRecords
  }
}

/**
 * Get the headings for the records, if there are results
 * @param {Array}
 * @returns {Array}
 */
const getRecordsV1Heading = (response) => {
  return response.length
    ? response[0][1].values.map(value => {
        return {
          modelTitle: value.conceptTitle,
          name: value.name,
          displayName: value.displayName
        }
      })
    : []
}