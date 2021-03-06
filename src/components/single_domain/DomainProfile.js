import React, { Component } from 'react'
import PropTypes from 'prop-types'
import qs from 'qs'

import DomainProfileHeader from './DomainProfileHeader'
import DomainStatsbar from './DomainStatsbar'
// import DomainScamReport from './DomainScamReport'
import DomainRedditBox from '../reddit/DomainRedditBox'
import DomainProfileActionContainer from './DomainProfileActionContainer'
// import DomainProfileAdsTxtStatus from './DomainProfileAdsTxtStatus'
import DomainProfileStageMap from './DomainProfileStageMap'
import { registryApiURL } from '../../models/urls'
import PubSub from 'pubsub-js'
import _ from 'lodash'

import './DomainProfile.css'
import getDomainState from '../../utils/getDomainState'
// import DomainNotInRegistryContainer from './DomainNotInRegistryContainer'
import DomainNeverAppliedContainer from './DomainNeverAppliedContainer'
// import { exists } from 'fs';

class DomainProfile extends Component {
  constructor (props) {
    super()

    const { params } = props.match
    const { domain } = params

    const query = qs.parse(props.location.search.substr(1))
    const action = query.action

    this.state = {
      domain,
      siteName: '',
      siteDescription: '',
      country: null,
      action,
      stage: null,
      domainData: null,
      existsInRegistry: true
    }

    // scroll to top
    window.scrollTo(0, -1)
  }

  componentDidMount () {
    this._isMounted = true
    this.fetchSiteData()
  }

  componentWillMount () {
    this.fetchDataEvent = PubSub.subscribe('DomainProfile.fetchSiteData', this.fetchSiteData.bind(this))
  }

  componentWillUnmount () {
    this._isMounted = false
  }

  render () {
    const {
      stage,
      domain,
      action,
      country,
      siteName,
      domainData,
      siteDescription,
      existsInRegistry
    } = this.state

    const redirectState = this.props.location.state

    return (
      <div className='DomainProfile'>
        { !existsInRegistry
          ? <div className='ui grid stackable padded'>
            <div className='row'>
              <div className='column sixteen wide BoxFrame NeverAppliedContainer'>
                <DomainNeverAppliedContainer domain={domain} />
              </div>
            </div>
          </div>
          : <div className='ui grid stackable padded'>
            <div className='row'>
              <div className='column seven wide'>
                <DomainProfileHeader
                  domain={domain}
                  name={siteName}
                  description={siteDescription}
                  country={country}
                  domainData={domainData}
                />
              </div>
              <div className='column nine wide mobile-hide'>
                <DomainStatsbar
                  domain={domain}
                  domainData={domainData}
                />
              </div>
            </div>
            <div className='row'>
              <div className='column four wide mobile-hide'>
                <DomainProfileStageMap
                  stage={stage}
                  domain={domain}
                  domainData={domainData}
                />
              </div>
              <div className='column five wide mobile-hide'>
                <DomainRedditBox
                  domain={domain}
                  domainData={domainData}
                />
                {
                  // <DomainProfileAdsTxtStatus domain={domain} />
                }
              </div>
              <div className='column seven wide'>
                <DomainProfileActionContainer
                  domain={domain}
                  action={action}
                  redirectState={redirectState}
                  domainData={domainData}
                />
              </div>
            </div>
          </div>
        }
      </div>
    )
  }

  async fetchSiteData () {
    let metadata
    let listing
    const { domain } = this.state

    if (!domain) return null

    try {
      listing = await (await window.fetch(`${registryApiURL}/registry/domain?domain=${domain}`)).json()

      try {
        metadata = await (await window.fetch(`${registryApiURL}/domains/metadata?domain=${domain}`)).json()
      } catch (error) {
        console.log(error)
      }

      let listingHash = listing.listingHashNew || listing.listingHashOld

      const domainData = await getDomainState({ domain, domainHash: listingHash })

      // check to see if the domain exists in the registry. if not, use this value to display Never Applied profile
      let existsInRegistry = _.isEmpty(domainData) ? false : true

      // If rejected --> Check to see if listing is withdrawn
      if (domainData.stage === 'rejected') {
        const getWithdrawn = async () => {
          const withdrawn = await (await window.fetch(`${registryApiURL}/registry/domains?filter=withdrawn`)).json()
          return withdrawn
        }
        let withdrawn = await getWithdrawn()
        for (let w of withdrawn) {
          if (w.domainHash === domainData.listingHash) {
            domainData.stage = 'withdrawn'
            if (domainData.challengeId > 0) {
              domainData.stageMapSrc = 'MapWithdrawnChallenge'
            } else {
              domainData.stageMapSrc = 'MapWithdrawnNoChallenge'
            }
            break
          }
        }
      }

      if (this._isMounted) {
        this.setState({
          domainData,
          existsInRegistry,
          siteName: domainData.siteName,
          siteDescription: metadata ? metadata.description : ''
        })
      }
    } catch (error) {
      console.log(error)
    }
  }
}

DomainProfile.propTypes = {
  location: PropTypes.object,
  match: PropTypes.object
}

export default DomainProfile
