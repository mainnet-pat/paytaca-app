import { ethers, utils } from 'ethers'

import { sep20Abi, erc721Abi } from './abi'

export function getProvider(test=false) {
  const rpcUrls = {
    test: 'http://35.220.203.194:8545/',
    main: 'https://smartbch.fountainhead.cash/mainnet',
  }

  return new ethers.providers.JsonRpcBatchProvider(test ? rpcUrls.test : rpcUrls.main);
}

export function getERC721Contract(contractAddress, test=false) {
  if (!utils.isAddress(contractAddress)) return

  return new ethers.Contract(
    contractAddress,
    erc721Abi,
    getProvider(test),
  )
}

export function getSep20Contract(contractAddress, test=false) {
  if (!utils.isAddress(contractAddress)) return

  return new ethers.Contract(
    contractAddress,
    sep20Abi,
    getProvider(test),
  )
}


export async function watchTransactions(address, {type=null, tokensOnly=false, contractAddresses=[], test=true}, callback) {
  if (!utils.isAddress(address)) return

  const contracts = !Array.isArray(contractAddresses) ? [] : contractAddresses.map(contractAddress => getSep20Contract(contractAddress, test))
  const cancelWatchFunctions = []
  const tokensWatched = []
  await Promise.all(
    contracts.map(async (contract) => {
      const receiveFilter = contract.filters.Transfer(null, address);
      const sendFilter = contract.filters.Transfer(address);
  
      const tokenName = await contract.name();
      const tokenSymbol = await contract.symbol();
      let eventFilter = [receiveFilter, sendFilter]
      if (type === 'incoming') eventFilter = receiveFilter
      if (type === 'outgoing') eventFilter = sendFilter
      const eventCallback = (...args) => {
        const tx = args[args.length-1]
        callback({
          tx: {
            hash: tx.transactionHash,
            to: tx.args._to,
            from: tx.args._from,
            value: tx.args._value,
            amount: utils.formatEther(tx.args._value),
            _raw: tx,
          },
          token: {
            address: contract.address,
            name: tokenName,
            symbol: tokenSymbol,
          }
        })
      }
      
      contract.on(eventFilter, eventCallback)
      tokensWatched.push({
        address: contract.address,
        name: tokenName,
        symbol: tokenSymbol,
      })

      cancelWatchFunctions.push(function () {
        contract.removeListener(eventFilter, eventCallback)
      })
    })
  )

  if (!tokensOnly) {
    const provider = getProvider(test)
    const event = 'block'
    const eventCallback = async (blockNumber) => {
      const block = await provider.getBlockWithTransactions(blockNumber);
      for (const tx of block.transactions) {
        const incoming = String(tx.to).toLowerCase() === address.toLowerCase()
        const outgoing = String(tx.from).toLowerCase() === address.toLowerCase()
        let emit = incoming || outgoing
        if (type === 'incoming') emit = incoming
        if (type === 'outgoing') emit = outgoing

        if (emit) {
          callback({
            tx: {
              hash: tx.hash,
              to: tx.to,
              from: tx.from,
              value: tx.value,
              amount: utils.formatEther(tx.value),
              _raw: tx,
            },
          })
        }
      }
    }
    provider.on(event, eventCallback)
    cancelWatchFunctions.push(function () {
      provider.removeListener(event, eventCallback)
    })
  }

  return {
    tokens: tokensWatched,
    stop: () => {
      cancelWatchFunctions.forEach(stopFunc => stopFunc())
    }
  }
}
