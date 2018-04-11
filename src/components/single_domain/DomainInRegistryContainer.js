import React, { Component } from 'react'
import PropTypes from 'prop-types'
import toastr from 'toastr'
import { Button, Input, Segment } from 'semantic-ui-react'
import commafy from 'commafy'
import Tooltip from '../Tooltip'
import calculateGas from '../../utils/calculateGas'

import registry from '../../services/registry'
import './DomainInRegistryContainer.css'
import DomainChallengeInProgressContainer from './DomainChallengeInProgressContainer'
import WithdrawInProgressContainer from '../dashboard/WithdrawInProgressContainer'
import TopOffInProgressContainer from './TopOffInProgressContainer'
import DomainChallengeContainer from './DomainChallengeContainer'
import Eth from 'ethjs'
import PubSub from 'pubsub-js'

const big = (number) => new Eth.BN(number.toString(10))
const tenToTheNinth = big(10).pow(big(9))

class DomainInRegistryContainer extends Component {
  constructor (props) {
    super()

    this.state = {
      domain: props.domain,
      account: registry.getAccount(),
      // didReveal: false,
      didClaim: false,
      inChallengeProgress: false,
      inWithdrawProgress: false,
      inTopOffProgress: false,
      minDeposit: null,
      canWithdraw: false,
      currentDeposit: null,
      stakedDifferenceUpdated: false
    }

    this.onChallenge = this.onChallenge.bind(this)
    this.withdrawListing = this.withdrawListing.bind(this)
    this.topOff = this.topOff.bind(this)
    this.updateStatus = this.updateStatus.bind(this)
    this.withdrawADT = this.withdrawADT.bind(this)
  }

  componentDidMount () {
    this._isMounted = true

    this.getPoll()
    // this.getReveal()
    // this.getClaims()
    this.getMinDeposit()
    this.getCurrentDeposit()
    this.checkOwner()
  }

  componentWillUnmount () {
    this._isMounted = false
  }

  render () {
    const {
      domain,
      inChallengeProgress,
      inWithdrawProgress,
      inTopOffProgress,
      minDeposit,
      canWithdraw,
      currentDeposit
    } = this.state

    const stakedDifference = currentDeposit - minDeposit
    const formattedStakedDifference = stakedDifference ? stakedDifference > 0 ? '+' + commafy(stakedDifference) : commafy(stakedDifference) : 0
    const stakedDifferenceClass = stakedDifference > 0 ? 'StakedDifferencePositive' : stakedDifference < 0 ? 'StakedDifferenceNegative' : 'StakedDifferenceZero'

    // const hasVotes = (votesFor || votesAgainst)

    return (
      <div className='DomainInRegistryContainer'>
        <div className='ui grid stackable'>
          <div className='column sixteen wide HeaderColumn'>
            <div className='row HeaderRow'>
              <div className='ui large header'>
              Stage: In Registry
                <Tooltip
                  info='The first phase of the voting process is the commit phase where the ADT holder stakes a hidden amount of votes to SUPPORT or OPPOSE the domain application. The second phase is the reveal phase where the ADT holder reveals the staked amount of votes to either the SUPPORT or OPPOSE side.'
                />
              </div>
              <Button
                basic
                className='right refresh'
                onClick={this.updateStatus}
              >
                Refresh Status
              </Button>
            </div>
          </div>
          <div className='ui divider' />
          <DomainChallengeContainer domain={domain} source='InRegistry' currentDeposit={currentDeposit} />
          <div className='column sixteen wide center aligned'>
            { canWithdraw
              ? <div>
                <Segment className='LeftSegment' floated='left'>
                  <p>Remove listing for</p>
                  <span className='RequiredADT'>
                    <strong>{currentDeposit ? commafy(currentDeposit) : '0'} ADT</strong>
                  </span>
                  <p className='RemoveInfo'>
                  Withdrawing your listing completely removes it from the adchain Registry and reimburses you the ADT amount above.
                  </p>
                  <div className='RemoveButtonContainer'>
                    <Button
                      className='RemoveButton'
                      basic
                      onClick={this.withdrawListing}>Remove Listing</Button>
                  </div>
                </Segment>
                <Segment className='RightSegment' floated='right'>
                  <div className='TopOffRow'>
                    <div className='CurrentDepositLabel'>
                  Current minDeposit:
                    </div>
                    <div className='CurrentDeposit'><strong>{minDeposit ? commafy(minDeposit) : '0'} ADT</strong></div>
                  </div>
                  <div className='TopOffRow'>
                    <div className='StakedDifferenceLabel'>
                    Staked Difference:
                    </div>
                    <div className={stakedDifferenceClass}><strong>{stakedDifference ? formattedStakedDifference : '0'} ADT</strong></div>
                  </div>
                  <div className='TopOffLabel'>
                  Enter ADT Amount
                  </div>
                  <div className='ADTInputContainer'>
                    <Input type='number' placeholder='ADT' id='ADTAmount' className='ADTInput' min='0' />
                  </div>
                  <div className='DepositWithdrawButtonRow'>
                    <div className='TopOffButtonContainer'>
                      <Button
                        className='TopOffButton'
                        basic
                        onClick={this.topOff}>Deposit ADT</Button>
                    </div>
                    <div className='WithdrawButtonContainer'>
                      <Button
                        className='WithdrawButton'
                        basic
                        onClick={this.withdrawADT}>Withdraw ADT</Button>
                    </div>
                  </div>
                </Segment>
              </div>
              : null
            }
          </div>
        </div>
        {inChallengeProgress ? <DomainChallengeInProgressContainer /> : null}
        {inWithdrawProgress ? <WithdrawInProgressContainer /> : null}
        {inTopOffProgress ? <TopOffInProgressContainer /> : null}
      </div>
    )
  }

  async getMinDeposit () {
    if (this._isMounted) {
      this.setState({
        minDeposit: (await registry.getMinDeposit()).toNumber()
      })
    }
  }

  // async getReveal () {
  //   const {domain, account} = this.state

  //   if (!account) {
  //     return false
  //   }

  //   try {
  //     const didReveal = await registry.didReveal(domain)

  //     if (this._isMounted) {
  //       this.setState({
  //         didReveal: didReveal
  //       })
  //     }
  //   } catch (error) {
  //     console.error('Domain In Registry Container Get Reveal Error: ', error)
  //     toastr.error('There was an error with your request')
  //   }
  // }

  async getPoll () {
    const {domain} = this.state

    try {
      const {
        votesFor,
        votesAgainst
      } = await registry.getChallengePoll(domain)

      if (this._isMounted) {
        this.setState({
          votesFor,
          votesAgainst
        })
      }
    } catch (error) {

    }
  }

  async getClaims () {
    const {domain, account} = this.state

    if (!account) {
      return false
    }

    try {
      const claimed = await registry.didClaim(domain)

      if (this._isMounted) {
        this.setState({
          didClaim: claimed
        })
      }
    } catch (error) {
      console.error('Domain In Registry Container Get Claims Error: ', error)
      toastr.error('There was an error with your request')
    }
  }

  onChallenge (event) {
    event.preventDefault()

    this.challenge()
  }

  async checkOwner () {
    const {domain, account} = this.state

    try {
      const listing = await registry.getListing(domain)
      if (listing.ownerAddress === account) {
        this.setState({
          canWithdraw: true
        })
      }
    } catch (error) {
      console.error('Domain In Registry Container Check Owner Error: ', error)
      toastr.error('There was an error with your request')
    }
  }

  async updateStatus () {
    const {domain} = this.state
    try {
      await registry.updateStatus(domain)
      await PubSub.publish('DomainProfileStageMap.updateStageMap')
      try {
        calculateGas({
          domain: domain,
          contract_event: true,
          event: 'update status',
          contract: 'registry',
          event_success: true
        })
      } catch (error) {
        console.log('error reporting gas')
      }
    } catch (error) {
      toastr.error('There was an error updating status')
      console.error(error)
      try {
        calculateGas({
          domain: domain,
          contract_event: true,
          event: 'update status',
          contract: 'registry',
          event_success: false
        })
      } catch (error) {
        console.log('error reporting gas')
      }
    }
  }

  async getCurrentDeposit () {
    const {domain} = this.state
    try {
      const listing = await registry.getListing(domain)
      if (listing.currentDeposit) {
        this.setState({
          currentDeposit: big(listing.currentDeposit).div(tenToTheNinth)
        })
      }
    } catch (error) {
      console.error(error)
    }
  }

  async withdrawListing () {
    const {domain} = this.state

    if (this._isMounted) {
      this.setState({
        inWithdrawProgress: true
      })
    }

    try {
      await registry.exit(domain)
      this.setState({
        canWithdraw: false
      })
      toastr.success('Successfully withdrew listing')
      if (this._isMounted) {
        this.setState({
          inWithdrawProgress: false
        })
      }
      try {
        calculateGas({
          domain: domain,
          contract_event: true,
          event: 'exit',
          contract: 'registry',
          event_success: true
        })
      } catch (error) {
        console.log('error reporting gas')
      }
    } catch (error) {
      console.error('Domain In Registry Container Withdraw Listing Error: ', error)
      toastr.error('There was an error with your request')
      if (this._isMounted) {
        this.setState({
          inWithdrawProgress: false
        })
      }
      try {
        calculateGas({
          domain: domain,
          contract_event: true,
          event: 'exit',
          contract: 'registry',
          event_success: false
        })
      } catch (error) {
        console.log('error reporting gas')
      }
    }
  }

  async topOff () {
    const {domain, currentDeposit} = this.state
    const amount = document.getElementById('ADTAmount').value

    // Possibly include other verification checks
    if (parseInt(amount, 10) < 0) {
      toastr.error('You must enter a positive amount.')
      return
    }

    if (this._isMounted) {
      this.setState({
        inTopOffProgress: true
      })
    }

    const stakedDeposit = parseInt(amount, 10) + parseInt(currentDeposit, 10)

    try {
      await registry.deposit(domain, amount)
      if (this._isMounted) {
        this.setState({
          currentDeposit: stakedDeposit,
          inTopOffProgress: false,
          stakedDifferenceUpdated: true
        })
        document.getElementById('ADTAmount').value = null
      }
      try {
        calculateGas({
          domain: domain,
          contract_event: true,
          event: 'top off',
          contract: 'registry',
          event_success: true
        })
      } catch (error) {
        console.log('error reporting gas')
      }
    } catch (error) {
      toastr.error('There was an error with your request')
      this.setState({
        inTopOffProgress: false
      })
      try {
        calculateGas({
          domain: domain,
          contract_event: true,
          event: 'top off',
          contract: 'registry',
          event_success: false
        })
      } catch (error) {
        console.log('error reporting gas')
      }
    }
  }

  async withdrawADT () {
    const {domain, currentDeposit, minDeposit} = this.state
    const amount = document.getElementById('ADTAmount').value

    if (parseInt(currentDeposit, 10) - parseInt(amount, 10) < minDeposit) {
      toastr.error('You can only withdraw an amount of tokens that is less than or equal to the staked difference.')
      return
    }
    if (parseInt(amount, 10) < 0) {
      toastr.error('You must enter a positive amount.')
      return
    }

    if (this._isMounted) {
      this.setState({
        inWithdrawProgress: true
      })
    }

    try {
      await registry.withdraw(domain, amount)
      if (this._isMounted) {
        this.setState({
          currentDeposit: parseInt(currentDeposit, 10) - parseInt(amount, 10),
          inWithdrawProgress: false
        })
        document.getElementById('ADTAmount').value = null
      }
      try {
        calculateGas({
          domain: domain,
          contract_event: true,
          event: 'withdraw',
          contract: 'registry',
          event_success: true
        })
      } catch (error) {
        console.log('error reporting gas')
      }
    } catch (error) {
      toastr.error('There was an error withdrawing your ADT')
      console.error(error)
      this.setState({
        inWithdrawProgress: false
      })
      try {
        calculateGas({
          domain: domain,
          contract_event: true,
          event: 'withdraw',
          contract: 'registry',
          event_success: false
        })
      } catch (error) {
        console.log('error reporting gas')
      }
    }
  }

  async challenge () {
    const {domain} = this.state

    let inApplication = null

    try {
      inApplication = await registry.applicationExists(domain)
    } catch (error) {
      toastr.error('There was an error with your request')
    }

    if (inApplication) {
      if (this._isMounted) {
        this.setState({
          inChallengeProgress: true
        })
      }

      try {
        await registry.challenge(domain)

        toastr.success('Successfully challenged domain')

        if (this._isMounted) {
          this.setState({
            inChallengeProgress: false
          })
        }
        try {
          calculateGas({
            domain: domain,
            contract_event: true,
            event: 'challenge',
            contract: 'registry',
            event_success: true
          })
        } catch (error) {
          console.log('error reporting gas')
        }
        // TODO: better way of resetting state
        setTimeout(() => {
          window.location.reload()
        }, 2e3)
      } catch (error) {
        toastr.error('There was an error with your request')
        if (this._isMounted) {
          this.setState({
            inChallengeProgress: false
          })
        }
        try {
          calculateGas({
            domain: domain,
            contract_event: true,
            event: 'challenge',
            contract: 'registry',
            event_success: false
          })
        } catch (error) {
          console.log('error reporting gas')
        }
      }
    } else {
      toastr.error('Domain not in application')
    }
  }
}

DomainInRegistryContainer.propTypes = {
  domain: PropTypes.string
}

export default DomainInRegistryContainer