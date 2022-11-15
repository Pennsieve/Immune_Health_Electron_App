
const initialState = () => ({
    showModels: ['patient', 'visits', 'samples', 'study'],
    orderBy:{
        patient: "",
        visits: "",
        samples: "storage_status",
        study: ""
    },
    models: [],
    filters: [],
    records: {},
    selectedRecords: {},        // search result including selected record filter
    selectedModel: 'patient',
    selectedRecord: null
})
  
export const state = initialState()

export const mutations = {  
    SET_MODELS(state, models) {
        state.models = models
    },
    SET_RECORDS_FOR_MODEL(state, records) {
        if (records.values == null) {
            records.values = []
        }
        state.records[records.model] = records.values
    },
    SET_SELECTED_RECORDS_FOR_MODEL(state, records) {
        if (records.values == null) {
            records.values = []
        }
        // turn into dict by id
        let recordDict = {}
        for (let r in records.values) {
            recordDict[records.values[r].id] = records.values[r]
        }

        state.selectedRecords[records.model] = recordDict
    },
    SET_FILTER(state, filter){
        state.filters = filter
    },
    REMOVE_FILTER(state, id) {
        const objIndex = state.filters.findIndex((obj => obj.id == id));
        state.filters.splice(objIndex, 1)

    },
    CREATE_FILTER(state, filter) {
        state.filters.push(filter)
    },
    UPDATE_FILTER(state, filter) {
        const objIndex = state.filters.findIndex((obj => obj.id == filter.id));

        state.filters[objIndex].model = filter.model
        state.filters[objIndex].property = filter.property
        state.filters[objIndex].operator = filter.operator
        state.filters[objIndex].value = filter.value

    },
    SET_SELECTED_MODEL(state, model) {
        state.selectedModel = model
    },
    SET_SELECTED_RECORD(state, record) {
        state.selectedRecord = record
    }

}

export const actions = {
    fetchModels: async({commit, rootState}) => {
        try {
            const url = `${rootState.config.apiUrl}/models/datasets/${rootState.config.datasetId}/concepts`

            const resp = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${rootState.profile.token}`
                }
            })

            if (resp.ok) {
                const models = await resp.json()
                commit('SET_MODELS', models)
            } else {
                return Promise.reject(resp)
            }
        } catch (err) {
            commit('SET_MODELS', [])
            return Promise.reject(err)
        }
    },
    fetchRecords: async({commit, rootState, state}, modelName) => {
        try {

            const url = `${rootState.config.api2Url}/metadata/query?dataset_id=${rootState.config.datasetId}`

            let filters = state.filters.map(value => {
                return {
                    "model": value.model,
                    "property": value.property,
                    "operator": value.operator,
                    "value": value.value
                }
            })

            let queryBody = {
                model: modelName,
                order_by: state.orderBy[modelName],
                filters: filters
            }

            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${rootState.profile.token}`
                },
                body: JSON.stringify(queryBody)
            })

            if (resp.ok) {
                const records = await resp.json()
                commit('SET_RECORDS_FOR_MODEL', {model:modelName, values:records})
            } else {
                return Promise.reject(resp)
            }
        } catch (err) {
            commit('SET_RECORDS_FOR_MODEL', {model:modelName, values:[]})
            return Promise.reject(err)
        }
    },
    fetchSelectedRecords: async({commit, rootState, state}, modelName) => {
        try {

            const url = `${rootState.config.api2Url}/metadata/query?dataset_id=${rootState.config.datasetId}`

            let filters = state.filters.map(value => {
                return {
                    "model": value.model,
                    "property": value.property,
                    "operator": value.operator,
                    "value": value.value
                }
            })

            filters.push({
                "model": state.selectedRecord.model,
                "property": "`@id`",
                "operator": "STARTS WITH",
                "value": state.selectedRecord.id
            })

            let queryBody = {
                model: modelName,
                order_by: state.orderBy[modelName],
                filters: filters
            }

            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${rootState.profile.token}`
                },
                body: JSON.stringify(queryBody)
            })

            if (resp.ok) {
                const records = await resp.json()
                commit('SET_SELECTED_RECORDS_FOR_MODEL', {model:modelName, values:records})
            } else {
                return Promise.reject(resp)
            }
        } catch (err) {
            commit('SET_SELECTED_RECORDS_FOR_MODEL', {model:modelName, values:[]})
            return Promise.reject(err)
        }
    },
    clearRecords: ({commit}, modelName) => {
        commit('SET_RECORDS_FOR_MODEL', {model:modelName, values:[]})
    },
    setFilters: ({commit}, filter) => {
        commit('SET_FILTER', filter)
    },
    createOrUpdateFilter: ({commit, state}, filter) => {
        const objIndex = state.filters.findIndex((obj => obj.id == filter.id));
        if (objIndex >= 0) {
            commit('UPDATE_FILTER', filter)
        } else {
            commit('CREATE_FILTER', filter)
        }
    },
    removeFilter: ({commit, state}, id) => {
        const objIndex = state.filters.findIndex((obj => obj.id == id));
        if (objIndex >= 0) {
            commit('REMOVE_FILTER', id)
        }
    },
    setSelectedModel: ({commit}, model) => {
        commit('SET_SELECTED_MODEL', model)
    },
    setSelectedRecord: ({commit}, record) => {
        commit('SET_SELECTED_RECORD', record)
    }

}

export const getters = {
    getRecordsByModel: (state) => (name) => {
        return state.records[name]
    },
    getSelectedRecordsByModel: (state) => (name) => {
        return state.selectedRecords[name]
    },
    detailsForModel: (state) => (name) => {
        for (let m in state.models) {
            if (state.models[m].name === name) {
                return state.models[m]
            }
        }
        return null
    },
    getRecords (state) {
      return state.records
    },
    recordsForSelectedModel: (state) => {
        return state.records[state.selectedModel]
    },
    getSelectedRecord: (state) => {
        return state.selectedRecord
    },
    selectedModelDetails: (state) => {
        for (let m in state.models) {
            if (state.models[m].name === state.selectedModel) {
                return state.models[m]
            }
        }
        return null
    }
}

const graphBrowseModule = {
    namespaced: true,
    state,
    mutations,
    actions,
    getters
}
  
export default graphBrowseModule
  