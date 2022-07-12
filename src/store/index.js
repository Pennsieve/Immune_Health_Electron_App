import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import { compose, pathOr, propOr, isEmpty } from 'ramda'

Vue.use(Vuex);

// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJraWQiOiJwcjhTaWE2dm9FZTcxNyttOWRiYXRlc3lJZkx6K3lIdDE4RGR5aGVodHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI4NDQ3NWU5NS1kNGYyLTQxNDItOTJlYS03OWQzN2NiODliMTQiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xX2I2MmJjNmZlLTFhZDMtNDU2Yi05YTk0LTZmMGYwZjgwNGZkMSIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2IxTnl4WWNyMCIsImNsaWVudF9pZCI6IjY3MG1vN3NpODFwY2Mzc2Z1YjdvMTkxNGQ4Iiwib3JpZ2luX2p0aSI6ImMxOGUyMzU4LTc3NzAtNGRiNC1hNjY5LTM5OGI3ODM2YjlkNCIsImV2ZW50X2lkIjoiZDAyMjc5YmItOTgzOC00MjU0LTlkZWQtNDQ1NjJlOGI0OWMzIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTY1NzY0ODk2NiwiZXhwIjoxNjU3NjUyNTY2LCJpYXQiOjE2NTc2NDg5NjYsImp0aSI6IjIzNmM5MGMyLWJjNDctNDJmZS1iMmZiLWMxNjQ5NzU0MzAzYiIsInVzZXJuYW1lIjoiODQ0NzVlOTUtZDRmMi00MTQyLTkyZWEtNzlkMzdjYjg5YjE0In0.IoBcjFiQBvkltsx7PFFHm7f48_z7UHxmfuPaAxlt_nrDf5HAy81pIxxHisBUhebic1-a_TcfRlZQ_kFJF8ZewYKPXYkNz8yqw0zYOEiYieiagQGgBcsZlAkfaR-wFhN-YkXm3Jjjh_uv_d6n0O3DdAnkmdcyrMaFIziZIt22rOVEs86X9J8i4JrRHzmWRWWrlaaaswqo_82-cUdq3yfS9dEhdrsNMyf7m14aZzLpRhlkp8U76Qm84wcmhmHXXEWi_MR7B4M37JTPzN-tNgwa-aHr9azk0UeTd5wKgQ8QE5y6cNsShk0rnFT2ylXMCkmamzDYpyqCL51c2G7rV1OHNA'

const header = {
  headers: { Authorization: `Bearer ${API_KEY}`}
}

const getStudyName = function(study) {
  const studyValues = propOr([], 'values', study)
  if (isEmpty(studyValues)) {
    return ''
  }
  return propOr('', 'value', studyValues[0])
}

const getQuery = async (model, searchCriteria) => {
  const searchFilters = []
  const filters = propOr([], 'filters', searchCriteria)
  let query = {
    model: model,
    datasets: [2] // dataset id for Penn Immune Health dataset
  }
  const relevantModelsUrl = `https://api.pennsieve.io/models/v2/organizations/655/autocomplete/models?relatedTo=${model}`
  const relevantModels = await axios.get(relevantModelsUrl, header).then(({data}) => {
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

const store = new Vuex.Store({
  state: {
    profile: null,
    allStudies: [],
    selectedStudy: {},
    searchModalVisible: false,
    searchModalSearch: {
      isModelInvalid: false, 
      filters: [],
      model: ''
    },
    scientificUnits: [],
    datasetRole: 'viewer',
    //The following 3 are all the records for the models of interest that are related to a selected study (selected study sets them initially)
    allPatientsMetadata: [],
    allVisitsMetadata: [],
    allSamplesMetadata: [],
    // The following 3 are filtered subsets of the 3 properties above after applying the searchModalSearch filters to them
    filteredPatientsMetadata: [],
    filteredSamplesMetadata: [],
    filteredVisitsMetadata: [],
    //TODO: variable to be updated whenever a single visit or sample is selected on either the data viz page or the uploads page. Will just have one upload target for now
    //TODO: This can be set by: selectedCurrVisit and selectedCurrSample (under the condition that only one of the two is selected and the list has a length of 1),
    uploadTarget: {},
    searchPage: ''
  },
  getters: {
    username (state) {
      const firstName = pathOr('', ['firstName'], state.profile)
      const lastName = pathOr('', ['lastName'], state.profile)
      const abbrvLastName = lastName.length === 1 ? lastName[0] : `${lastName[0]}.`
      return `${firstName} ${abbrvLastName}`
    },
    userToken (state) {
      return propOr('', 'token', state.profile)
    },
    isLoggedIn (state) {
      return state.profile !== null
    },
    allStudies (state) {
      return state.allStudies
    },
    selectedStudy (state) {
      return state.selectedStudy
    },
    selectedStudyName (state) {
      return getStudyName(state.selectedStudy)
    },
    scientificUnits (state) {
      return state.scientificUnits
    },
    searchModalVisible (state) {
      return state.searchModalVisible
    },
    getPermission: state => (role = 'manager') => {
      const roles = {
        owner: 3,
        manager: 2,
        editor: 1,
        viewer: 0
      }
      return roles[state.datasetRole] >= roles[role]
    },
    getDatasetRole (state) {
      return state.datasetRole
    },
  },
  mutations: {
    SET_ALL_STUDIES(state, data) {
      state.allStudies = data
    },
    SET_SELECTED_STUDY(state, data) {
      state.selectedStudy = data
    },
    SET_ALL_PATIENTS_METADATA(state, data) {
      state.allPatientsMetadata = data
    },
    SET_ALL_VISITS_METADATA(state, data) {
      state.allVisitsMetadata = data
    },
    SET_ALL_SAMPLES_METADATA(state, data) {
      state.allSamplesMetadata = data
    },
    SET_FILTERED_PATIENTS_METADATA(state, data) {
      state.filteredPatientsMetadata = data
    },
    SET_FILTERED_VISITS_METADATA(state, data) {
      state.filteredVisitsMetadata = data
    },
    SET_FILTERED_SAMPLES_METADATA(state, data) {
      state.filteredSamplesMetadata = data
    },
    UPDATE_SEARCH_MODAL_VISIBLE (state, data) {
      state.searchModalVisible = data
    },
    UPDATE_SEARCH_MODAL_SEARCH (state, data) {
      state.searchModalSearch = data
    },
    SET_SCIENTIFIC_UNITS (state, data) {
      state.scientificUnits = data
    },
    SET_DATASET_ROLE (state, data) {
      const role = propOr('viewer', 'role', data)
      state.datasetRole = role
    },
    SET_SEARCH_PAGE (state, data) {
      state.searchPage = data
    }
  },
  actions: {
    // TODO: 'token' should not take the value of API_KEY
    async login({ dispatch, state }) {
      // Set a dummy profile for now
      this.state.profile = {
        firstName: 'Test',
        lastName: 'Profile',
        token: API_KEY
      }
      await dispatch('fetchStudies')
      await dispatch('setSelectedStudy', state.allStudies[0])
      await dispatch('setScientificUnits')
    },
    setSelectedStudy({ commit }, data) {
      commit('SET_SELECTED_STUDY', data)
    },
    async fetchStudies({ commit }) {
      const studiesUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances?api_key=${API_KEY}`

      await axios.get(studiesUrl).then(response => {
        commit('SET_ALL_STUDIES', response.data)
      })
    },
    // fetches all the patients metadata for the selected study
    async fetchAllPatientsMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const patientsStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/patient?includeIncomingLinkedProperties=true`
      await axios.get(patientsStudyMetadataUrl, header).then(response => {
        commit('SET_ALL_PATIENTS_METADATA', response.data)
      })
    },
    // fetches all the visits metadata for the selected study
    async fetchAllVisitsMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const visitsStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/visits?includeIncomingLinkedProperties=true`
      await axios.get(visitsStudyMetadataUrl, header).then(response => {
        commit('SET_ALL_VISITS_METADATA', response.data)
      })
    },
    // fetches all the samples metadata for the selected study
    async fetchAllSamplesMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const samplesStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/samples?includeIncomingLinkedProperties=true`
      await axios.get(samplesStudyMetadataUrl, header).then(response => {
        commit('SET_ALL_SAMPLES_METADATA', response.data)
      }) 
    },
    async applyFiltersToMetadata({ commit, state }) {
      const toQueryParams = (params) => Object.keys(params).map(key => key + '=' + params[key]).join('&');
      const params = compose(
        toQueryParams
      )({limit: 25, offset: 0})
      
      const filteredRecordsUrl = `https://api.pennsieve.io/models/v2/organizations/655/search/records?${params}`

      // if there are no valid filters then return all metadata
      if (!state.searchModalSearch.filters.some(filter => !filter.isInvalid)) {
        commit('SET_FILTERED_VISITS_METADATA', state.allVisitsMetadata)
        commit('SET_FILTERED_PATIENTS_METADATA', state.allPatientsMetadata)
        commit('SET_FILTERED_SAMPLES_METADATA', state.allSamplesMetadata)
      } else {
        const visitsQuery = await getQuery('visits', state.searchModalSearch)

        await axios.post(filteredRecordsUrl, visitsQuery, header).then(response => {
          let filteredVisitsRecords = pathOr([], ['data', 'records'], response)
          // Filter by selected study
          filteredVisitsRecords = filteredVisitsRecords.filter(record => record.values['study'] === getStudyName(state.selectedStudy))
          commit('SET_FILTERED_VISITS_METADATA', filteredVisitsRecords)
        }) 

        const patientsQuery = await getQuery('patient', state.searchModalSearch)

        await axios.post(filteredRecordsUrl, patientsQuery, header).then(response => {
          let filteredPatientsRecords = pathOr([], ['data', 'records'], response)
          // Filter by selected study
          filteredPatientsRecords = filteredPatientsRecords.filter(record => record.values['study'] === getStudyName(state.selectedStudy))
          commit('SET_FILTERED_PATIENTS_METADATA', filteredPatientsRecords)
        })

        const samplesQuery = await getQuery('samples', state.searchModalSearch)

        await axios.post(filteredRecordsUrl, samplesQuery, header).then(response => {
          let filteredSamplesRecords = pathOr([], ['data', 'records'], response)
          // Filter by selected study
          filteredSamplesRecords = filteredSamplesRecords.filter(record => record.values['study'] === getStudyName(state.selectedStudy))
          commit('SET_FILTERED_SAMPLES_METADATA', filteredSamplesRecords)
        })     
      }
    },
    updateSearchModalVisible({ commit }, data) {
      commit('UPDATE_SEARCH_MODAL_VISIBLE', data)
    },
    updateSearchModalSearch({ commit }, data) {
      commit('UPDATE_SEARCH_MODAL_SEARCH', data)
    },
    setDatasetRole({commit}, data) {
      commit('SET_DATASET_ROLE', data)
    },
    setSearchPage({ commit }, data) {
      commit('SET_SEARCH_PAGE', data)
    },
    async setScientificUnits ({ commit }) {
      const scientificUnitsUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/properties/units?api_key=${API_KEY}`
      await axios.get(scientificUnitsUrl).then(({data}) => {
        data.push({
          dimension: 'Other',
          units: [{
            name: 'Other',
            displayName: 'Other',
            description: 'Other'
          }]
        })
        commit('SET_SCIENTIFIC_UNITS', data)
      })
    }
  },
});

export default store;
