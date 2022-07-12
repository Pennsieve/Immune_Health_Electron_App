import Vue from "vue";
import Vuex from "vuex";
import axios from 'axios'
import { pathOr, propOr, isEmpty } from 'ramda'

Vue.use(Vuex);

// HARDCODED FOR NOW: UPDATE apiKey VALUE WITH A VALID LOGGED IN USER API TOKEN TO GET STUDIES POPULATED
const API_KEY = 'eyJraWQiOiJwcjhTaWE2dm9FZTcxNyttOWRiYXRlc3lJZkx6K3lIdDE4RGR5aGVodHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI2YzViZGUwMS1mM2U1LTRhYzQtYmZkYi1mODgzYjkyZTQ1YzYiLCJkZXZpY2Vfa2V5IjoidXMtZWFzdC0xXzAzNjk2YTg5LWRlZWItNDZhOC1hNjA4LWQzNWY4MmJiNjdjMiIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2IxTnl4WWNyMCIsImNsaWVudF9pZCI6IjY3MG1vN3NpODFwY2Mzc2Z1YjdvMTkxNGQ4Iiwib3JpZ2luX2p0aSI6IjViMWNkYTk2LWVlZjctNGQ5OC1iZGFlLTRhMzcxZTY1OThiZiIsImV2ZW50X2lkIjoiN2I1ZmNmYTQtOTY0NS00ODUxLWExODYtYzBiYTM2ZjBlODU4IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTY1NzY0MTY3MSwiZXhwIjoxNjU3NjQ1MjcxLCJpYXQiOjE2NTc2NDE2NzEsImp0aSI6IjM3MWNlMTE3LWMwMWMtNGU1OS05MmI5LTNiYzZlODNjYTM1YSIsInVzZXJuYW1lIjoiNmM1YmRlMDEtZjNlNS00YWM0LWJmZGItZjg4M2I5MmU0NWM2In0.GHHcaG9qoQYZFjhcpNogWheIpSRkfnaCL7hY4RBzX1euPFcedc8OZFZesTbjEgr2NS_hL50GzgRM38hYoE904G04-JhZ6OqFARZ-3Wm2sO1Fsub2TfNPmNfEuQ2-8pa_xtnzmFbX8NzP4l-ePM4iwd8BJ2-L8Z556Lew7kKFF5mNJnLuZ-nfcwlz65D7vHwJAyXyUXBK5VNAROvwQfr_dDPmFwlkxybF-X5wDLrkLzQ7RTToHfYXCsYFEm80TYOkSh5raKA_0VHYERB-yzO-_f2KrkKede-O9qMx-MtEmD7b6AJ_BWq6OJbwLdjP0EbVyY0SzzRvZy5b6ifuQYPRMw'

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
