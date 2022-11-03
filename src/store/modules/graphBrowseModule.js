const initialState = () => ({
    showModels: ['patient', 'visits', 'samples'],
    models: [],
    filters: [{
        "model": "study",
        "property": "sstudyid",
        "operator": "STARTS WITH",
        "value": "CEIRR_flu"
    }],
    records: {},
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
    SET_FILTER(state, filter){
        state.filters = filter
    },

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
    fetchRecords: async({commit, rootState}, modelName) => {
        try {

            const url = `${rootState.config.api2Url}/metadata/query?dataset_id=${rootState.config.datasetId}`

            let queryBody = {
                model: modelName,
                filters: rootState.graphBrowseModule.filters
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
                console.log(records)
                commit('SET_RECORDS_FOR_MODEL', {model:modelName, values:records})
            } else {
                return Promise.reject(resp)
            }
        } catch (err) {
            commit('SET_RECORDS_FOR_MODEL', {model:modelName, values:[]})
            return Promise.reject(err)
        }
    },
    clearRecords: ({commit}, modelName) => {
        commit('SET_RECORDS_FOR_MODEL', {model:modelName, values:[]})
    },
    setFilters: ({commit}, filter) => {
        commit('SET_FILTER', filter)
    }
}

export const getters = {
    getRecordsByModel: (state) => (name) => {
        return state.records[name]
    },
    getRecords (state) {
      return state.records
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
  