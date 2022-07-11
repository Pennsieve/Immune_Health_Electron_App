import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import { pathOr, propOr, isEmpty } from 'ramda'

Vue.use(Vuex);

// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.NITUylMdmqEmk3qc2wVVGjGIXlK6t8uQIEbNZmMNGxYZ0y81uxyQ9RKDznGTCBZB38Rf9v8DkAkutKA7pvg_MXnSxG74gxFkmKkuIJn1pEs0YKWzeUmIp7uhvCygZEzM3ZoH_wQNruvZ0iKyS2PflXi27QJmmsHy79i5dF9tpoZ7x2E3w8rldsT2yN7yBc1VvGWv6HhEYmNE8AZx7MvywBOas1n8Mc85XOpcNyvmL0x0ltJRfHe1Sf5PXgO8SIP2qw7UgGA8ruDD5A6L4OiqbrKDWsA_QP9g69gNDGu-vcrlMmvOVyXb-2oez3mhmbj23q1OMGCF6so2XgnjWaTZcA.k0C69aZIepVRfM0G.C-BWYf8_HhTcA_qNlAEfUmSvGYNhXDfhlKsIaWUpwTdbZAoa3UgVCUfehFcnngOK6oL_r4hAVI-4CDwlNUAlbn9mOjZx5q1MYvkz7ENs5pF1zW6LzspK4EnuDDhAihwPiio2KmMQGhhBW3Cl5K_4sI_Q2EeTE0-J3bGWMenHBw5qG9U7Sj40r9tCqog2Wqmssu99l_1QfcxlUiZr8qywbgNwmWLp9YuY-U__fA1R8pBwpeZJKIOixNVCdjALa1mlC9gQnidnBBsdvxjlz6bowcJX9nWmjrTAZxPRKlDWXHwDDfzfvWhh7asTIzZIvFRdGnYDKqx_JKng6Tv91P1rebhfOUi2BpcVm1muxoDmg_jqUBHijGYwTjoR55S3UmPgbomZP7ToOzwTrhMSlQFL7MvVK56AqFEOnzzj4QhWXEg2NnGZk8INX0w6ofl4Gde2-byPDoq3i9qTm81-CxWHQfMUcWVLmaah-rY0bvccKOxNrPfiAPRVNLE51QNR0qaLR-QuD7lzr_o1YNe-iZGm8WE2msyU4s8b1jY-daYrjTfzwjZeuzWUoQHD5s1c92W4F3f5RUP5c5HrDidjBi0TBSLucOlzELLXWv9Veh7NvkhySlaaSKmwm8NqSOSuG4JTE0alM9bG4ZBuBp_1aodtUgjVdaMtSnjTZMvUW5GEgxfRUqjjRFVHOsAPxSPAauqCRLDQ1YVD7uvM1bgzvMhD3ODDMHiDM7l6wHnJc9z1DyCQrPIh1jY0vFqCwCvFTk028ncNHhU4Vb_m1PVXs5na7yjztZfSBRg2qBkr5xMUlr0Y6U2Eq0sWexsE_tI0dxHjxMQcbV5kqouR5S8KNO-v9TSyutct7qDzpIv8k4SZ8Uawsg0BPxzYNyQl588StoDqrG3V1iCIbIiLJuuOMVngYqCAfqFA2Ki5F99FFnKoDU5QjHb0nptCPkHgFbWZBsGF4g7P1j1cPxKgyDzHc1_ycsbGecsm0ayMnzp2l1Lm5P0uAfBD9UwD7P4_P3pd7qTHtffgwUl66swRB-Kc9trwz56hkgEgpH0XFUkGVOxLqWk9sqjp85y-fhrgm1NbX0uJtwlg7n9zCZwyRTuko5VHUhXw1roau4bfRjXJxLenaHcxFuBJWGCdp_jA4EfdZIhwmPjtZi5ttbdB4L3OTwoGgi0sriMCbAFydM_dH4kmWo-7OTqj7rDEaL9HRJCSzHFR4SdyPWTGnd8YE-zBZLPkPEB70H8YkXh9i2C-T4YpIHEi_g_5Yj9f1L0BRRbNRC7iGGouJKRBsfA1yJgI542H7KKtLJwu15tz6KWUkh1P5uUe-DwEIrUuEurzz7sRQBftN4GEqd0tT8m5_6qbWKhYX5Evxwgei7CWQi0Z1vD0kwKQdZHwpXjD1esltEC9XQ8V6eVykP7GJGYFNZTS4SUtvgyA_qhs2eiQ4qm7IAyR.SoPPOpQPgOO3Ie2ISjBqpg'

const DATASET_ID = 'N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/records/9c579bef-6ce0-4632-be1c-a95aadc982c4/30096499-ccd3-4af3-8cb2-1ef9fba359f4'

//const uploadDestination = 'https://app.pennsieve.io/N:organization:aab5058e-25a4-43f9-bdb1-18396b6920f2/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/files/N:collection:fda8d13c-658f-475a-b90a-cd7a79ef7b87'
const store = new Vuex.Store({
  state: {
    profile: null,
    allStudies: [],
    selectedStudy: {},
    selectedStudyPatientsMetadata: [],
    searchModalVisible: false,
    searchModalSearch: {},
    scientificUnits: [],
    //hardcoded value for testing...random record to link files to'
    datasetId: DATASET_ID,
    uploadDestination: 'https://app.pennsieve.io/N:organization:aab5058e-25a4-43f9-bdb1-18396b6920f2/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/records/9c579bef-6ce0-4632-be1c-a95aadc982c4/30096499-ccd3-4af3-8cb2-1ef9fba359f4'

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
      const studyValues = propOr([], 'values', state.selectedStudy)
      if (isEmpty(studyValues)) {
        return ''
      }
      return propOr('', 'value', studyValues[0])
    },
    scientificUnits (state) {
      return state.scientificUnits
    },
    searchModalVisible (state) {
      return state.searchModalVisible
    },
    uploadDestination (state) {
      return state.uploadDestination
    },
    datasetId (state) {
      return state.datasetId
    }
  },
  mutations: {
    /*
    UPLOAD_COUNT_ADD (state, count) {
      //find another way
      //const totalCount = propOr(0, 'uploadCount', state) + count;
      state.uploadCount = totalCount
    },
    */
    /*
    UPDATE_TOTAL_UPLOAD_SIZE (state, data) {
      //cant get below from prop
      //const updatedSize = propOr(0, 'totalUploadSize', state) + data
      state.totalUploadSize = updatedSize
    },
    */
    /*
    UPDATE_UPLOAD_REMAINING_ADD (state, size) {
      //change this
      //const totalRemaining = propOr(0, 'uploadRemaining', state) + size;
      state.uploadRemaining = totalRemaining
    },
    */
    UPDATE_UPLOAD_STATUS (state, uploading) {
      state.uploading = uploading
    },
    SET_ALL_STUDIES(state, data) {
      state.allStudies = data
    },
    SET_SELECTED_STUDY(state, data) {
      state.selectedStudy = data
    },
    SET_SELECTED_STUDY_PATIENTS_METADATA(state, data) {
      state.selectedStudyPatientsMetadata = data
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
  },
  actions: {
    //add one for setting record linking (upload) destination
    uploadCountAdd: ({ commit }, evt) => commit('UPLOAD_COUNT_ADD', evt),
    updateTotalUploadSize: ({commit}, evt) => commit('UPDATE_TOTAL_UPLOAD_SIZE', evt),
    updateUploadStatus: ({ commit }, evt) => commit('UPDATE_UPLOAD_STATUS', evt),
    updateUploadRemainingAdd: ({ commit }, evt) => commit('UPDATE_UPLOAD_REMAINING_ADD', evt),
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
    async setSelectedStudy({ commit }, data) {
      await commit('SET_SELECTED_STUDY', data)
    },
    async fetchStudies({ commit }) {
      const studiesUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances?api_key=${API_KEY}`

      let responseData = []
      await axios.get(studiesUrl).then(response => {
        responseData = response.data
      })
      await commit('SET_ALL_STUDIES',responseData)
    },
    async fetchSelectedStudyPatientsMetadata({ commit, state }) {
      const selectedStudyId = propOr('', 'id', state.selectedStudy)
      const patientsStudyMetadataUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/concepts/33a61ee7-fce9-4f0c-823c-78368ed8dc42/instances/${selectedStudyId}/relations/patient?includeIncomingLinkedProperties=true`
      const header = {
        headers: { Authorization: `Bearer ${API_KEY}`}
      }
      let responseData = []
      await axios.get(patientsStudyMetadataUrl, header).then(response => {
        responseData = response.data
      })
      await commit('SET_SELECTED_STUDY_PATIENTS_METADATA', responseData)
    },
    updateSearchModalVisible({ commit }, data) {
      commit('UPDATE_SEARCH_MODAL_VISIBLE', data)
    },
    updateSearchModalSearch: ({ commit }, data) => {
      commit('UPDATE_SEARCH_MODAL_SEARCH', data)
    },
    async setScientificUnits ({ commit }) {
      const scientificUnitsUrl = `https://api.pennsieve.io/models/datasets/N:dataset:e2de8e35-7780-40ec-86ef-058adf164bbc/properties/units?api_key=${API_KEY}`
      let responseData = []
      await axios.get(scientificUnitsUrl).then(({data}) => {
        data.push({
          dimension: 'Other',
          units: [{
            name: 'Other',
            displayName: 'Other',
            description: 'Other'
          }]
        })
        responseData = data
      })
      await commit('SET_SCIENTIFIC_UNITS', responseData)
    }
  },
});

export default store;
