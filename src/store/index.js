import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import { handleV1RecordsResponse, handleV2RecordsResponse } from "@/utils/formatPennsieveResponse";
import { compose, pathOr, propOr, isEmpty } from 'ramda'

Vue.use(Vuex);

// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJraWQiOiJwcjhTaWE2dm9FZTcxNyttOWRiYXRlc3lJZkx6K3lIdDE4RGR5aGVodHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI5NzY0NGZkYy1iZjFmLTRkMzUtOWRlMC1hYzlkODUxZmEyZTEiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xXzZkNDc4M2U3LThhNTctNGY0Yy1iODQ5LWYzZGExMGUzMmRlNSIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2IxTnl4WWNyMCIsImNsaWVudF9pZCI6IjY3MG1vN3NpODFwY2Mzc2Z1YjdvMTkxNGQ4Iiwib3JpZ2luX2p0aSI6IjIwMWNjNzUwLWIyN2UtNDI5My05N2Q3LTFhN2EyYTAwMjA5YiIsImV2ZW50X2lkIjoiMTNlNjMyNDMtZmIwYi00ZWQxLWEyNTMtYWExMzRlNzU4YzVhIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTY1ODI0NDc2NywiZXhwIjoxNjU4MjYzMjgxLCJpYXQiOjE2NTgyNTk2ODEsImp0aSI6IjUzOTc1OGVkLTA0YTUtNDcwMy1iMTY2LTIwZDE3MzU5NjQ3NSIsInVzZXJuYW1lIjoiOTc2NDRmZGMtYmYxZi00ZDM1LTlkZTAtYWM5ZDg1MWZhMmUxIn0.gHs3XCNRLQg3eDLguZpaN-MkNVDUFxIITO2wHvpNqAlj_1EM4_IQ_288cA608RMdPRowU0eyuTNa3fFIiQhmYv_t-_PJg0Y3j-8D2hG6Hxx0hIJP9iTw5bR65L76q2EsSIWiMzmMHsnVCkxkw_O4ve8pazGXeZ3XB78_0Jzjz8Spa-M69n9Tycg7K786oInS8YXTlng7ESMG336lKplJVtVb9bAPnwi1ej8gUbyYrBosx12xlNwmg0hj_jQHK-GdKGc3YmBO-ibH1UBKhzi66h4_zM6ZZvdHMBcVk9ARlGM6WxGkjedhEI9oFM4-FCWcwUMhC2nhdMmWHCFn1rAl0A'

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
    // The following 3 are all the records for the models of interest that are related to a selected study (selected study sets them initially)
    allPatientsMetadata: [],
    allVisitsMetadata: [],
    allSamplesMetadata: [],
    // The following 3 are filtered subsets of the 3 properties above after applying the searchModalSearch filters to them
    filteredPatientsMetadata: [],
    filteredSamplesMetadata: [],
    filteredVisitsMetadata: [],
    // TODO: variable to be updated whenever a single visit or sample is selected on either the data viz page or the uploads page. Will just have one upload target for now
    // TODO: This can be set by: selectedCurrVisit and selectedCurrSample (under the condition that only one of the two is selected and the list has a length of 1),
    uploadTarget: {},
    searchPage: '',
    // The table headings for the metadata being displayed in the records table
    visitsTableHeadings: [],
    samplesTableHeadings: []
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
    },
    SET_VISITS_TABLE_HEADINGS (state, data) {
      state.visitsTableHeadings = data
    },
    SET_SAMPLES_TABLE_HEADINGS (state, data) {
      state.samplesTableHeadings = data
    },
    SET_UPLOAD_TARGET (state, data) {
      state.uploadTarget = data
    },
  },
  actions: {
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
        const v1Response = handleV1RecordsResponse(response.data)
        const allPatientsMetadata = v1Response.records
        commit('SET_ALL_PATIENTS_METADATA', allPatientsMetadata)
      })
    },
    // fetches all the visits metadata for the selected study
    async fetchAllVisitsMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const visitsStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/visits?includeIncomingLinkedProperties=true`
      await axios.get(visitsStudyMetadataUrl, header).then(response => {
        const v1Response = handleV1RecordsResponse(response.data)
        const allVisitsMetadata = v1Response.records
        const visitsTableHeadings = v1Response.headings

        commit('SET_ALL_VISITS_METADATA', allVisitsMetadata)
        commit('SET_VISITS_TABLE_HEADINGS', visitsTableHeadings)
      })
    },
    // fetches all the samples metadata for the selected study
    async fetchAllSamplesMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const samplesStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/samples?includeIncomingLinkedProperties=true`
      await axios.get(samplesStudyMetadataUrl, header).then(response => {
        const v1Response = handleV1RecordsResponse(response.data)
        const allSamplesMetadata = v1Response.records
        const samplesTableHeadings = v1Response.headings
        commit('SET_ALL_SAMPLES_METADATA', allSamplesMetadata)
        commit('SET_SAMPLES_TABLE_HEADINGS', samplesTableHeadings)
      }) 
    },
    async applyFiltersToMetadata({ commit, state }) {
      const toQueryParams = (params) => Object.keys(params).map(key => key + '=' + params[key]).join('&');
      const params = compose(
        toQueryParams
      )({limit: 25, offset: 0})
      
      const filteredRecordsUrl = `https://api.pennsieve.io/models/v2/organizations/655/search/records?${params}`

      // if there are no valid filters then return all metadata
      // TODO: Figure out what to do about different response structure for filtered vs all (When filter is applied it is just an object so maybe we should just always grab [1] from values when no filters are applied)
      if (!state.searchModalSearch.filters.some(filter => !filter.isInvalid)) {
        commit('SET_FILTERED_VISITS_METADATA', state.allVisitsMetadata)
        commit('SET_FILTERED_PATIENTS_METADATA', state.allPatientsMetadata)
        commit('SET_FILTERED_SAMPLES_METADATA', state.allSamplesMetadata)
      } else {
        const visitsQuery = await getQuery('visits', state.searchModalSearch)

        await axios.post(filteredRecordsUrl, visitsQuery, header).then(response => {
          const v2Response = handleV2RecordsResponse(propOr([], 'data', response))
          let filteredVisitsRecords = v2Response.records
          const visitsTableHeadings = v2Response.headings
          // Filter by selected study
          filteredVisitsRecords = filteredVisitsRecords.filter(record => record['study'] === getStudyName(state.selectedStudy))
          commit('SET_FILTERED_VISITS_METADATA', filteredVisitsRecords)
          commit('SET_VISITS_TABLE_HEADINGS', visitsTableHeadings)
        }) 

        const patientsQuery = await getQuery('patient', state.searchModalSearch)

        await axios.post(filteredRecordsUrl, patientsQuery, header).then(response => {
          const v2Response = handleV2RecordsResponse(propOr([], 'data', response))
          let filteredPatientsRecords = v2Response.records

          // Filter by selected study
          filteredPatientsRecords = filteredPatientsRecords.filter(record => record['study'] === getStudyName(state.selectedStudy))
          commit('SET_FILTERED_PATIENTS_METADATA', filteredPatientsRecords)
        })

        const samplesQuery = await getQuery('samples', state.searchModalSearch)

        await axios.post(filteredRecordsUrl, samplesQuery, header).then(response => {
          const v2Response = handleV2RecordsResponse(propOr([], 'data', response))
          let filteredSamplesRecords = v2Response.records
          const samplesTableHeadings = v2Response.headings
          // Filter by selected study
          filteredSamplesRecords = filteredSamplesRecords.filter(record => record['study'] === getStudyName(state.selectedStudy))
          commit('SET_FILTERED_SAMPLES_METADATA', filteredSamplesRecords)
          commit('SET_SAMPLES_TABLE_HEADINGS', samplesTableHeadings)
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
    setUploadTarget({ commit }, data) {
      commit('SET_UPLOAD_TARGET', data)
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