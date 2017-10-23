import React, { Component } from 'react'
import PropTypes from 'prop-types'
import toastr from 'toastr'
import { Popup } from 'semantic-ui-react'

import registry from '../services/registry'

import RequestVotingRightsInProgressContainer from './RequestVotingRightsInProgressContainer'
import './RequestVotingRightsContainer.css'

class RequestVotingRightsContainer extends Component {
  constructor (props) {
    super()

    this.state = {
      account: props.account,
      requestVotes: null,
      inProgress: false
    }

    this.onRequest = this.onRequest.bind(this)
    this.onVotesKeyUp = this.onVotesKeyUp.bind(this)
  }

  componentDidMount () {
    this._isMounted = true
  }

  componentWillUnmount () {
    this._isMounted = false
  }

  render () {
    const {
      inProgress
    } = this.state

    return (
      <div className='RequestVotingRightsContainer BoxFrame'>
        <div className='ui grid stackable center aligned'>
          <div className='column sixteen wide'>
            <p>Request Voting Rights
              <Popup
                trigger={<i className='icon info circle' />}
                content='Pre-requesting voting rights will minimizes the number of transactions when performing commit votes. This can save gas fees if voting frequently. 1 ADT = 1 Vote. Pre-requesting voting rights will withdraw AdToken from your account to the adChain registry PLCR contract. You may convert the votes to adToken and withdraw at any time.'
              />
            </p>
            <div><small>Enter amount of ADT to convert to votes</small></div>
            <div className='ui input action mini'>
              <input
                type='text'
                placeholder='100'
                id='RequestVotingRightsContainerInput'
                onKeyUp={this.onVotesKeyUp}
              />
              <button
                onClick={this.onRequest}
                className='ui button blue tiny'>
                Request Voting Rights
              </button>
            </div>
          </div>
        </div>
        {inProgress ? <RequestVotingRightsInProgressContainer /> : null}
      </div>
    )
  }

  onVotesKeyUp (event) {
    this.setState({
      requestVotes: event.target.value | 0 // coerce to int
    })
  }

  onRequest (event) {
    event.preventDefault()

    this.requestRights()
  }

  async requestRights () {
    const {requestVotes} = this.state

    if (!requestVotes) {
      toastr.error('Please enter amount of adToken')
      return false
    }

    if (this._isMounted) {
      this.setState({
        inProgress: true
      })
    }

    try {
      await registry.requestVotingRights(requestVotes)

      // TODO: better way to reset input
      const input = document.querySelector('#RequestVotingRightsContainerInput')

      if (input) {
        input.value = ''
      }

      toastr.success('Success')
    } catch (error) {
      toastr.error(error.message)
    }

    if (this._isMounted) {
      this.setState({
        inProgress: false
      })
    }
  }
}

RequestVotingRightsContainer.propTypes = {
  account: PropTypes.string
}

export default RequestVotingRightsContainer
