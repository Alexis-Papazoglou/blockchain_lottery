import { useEffect, useState } from 'react';
import { loadWeb3, loadContract, getWeb3, getContract } from './web3';
import LotteryItem from './LotteryItem';
import './App.css';

//image imports
import phoneImage from './assets/phone.jpeg';
import carImage from './assets/car.jpg';
import macImage from './assets/macbook.jpg';

function App() {
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('No wallet connected');
  const [contractAdmins, setContractAdmins] = useState([]);
  const [winners, setWinners] = useState([]);
  const [isDrawn, setIsDrawn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  //console.log(winners);

  useEffect(() => {
    const fetchIsDrawn = async () => {
      if (contract) {
        const isDrawn = await contract.methods.isDrawn().call();
        setIsDrawn(isDrawn);
      }
    };

    fetchIsDrawn();
    fetchTotalAmount();
  });

  useEffect(() => {
    const init = async () => {
      try {
        await loadWeb3();
        await loadContract();
        const web3 = getWeb3();
        const contract = getContract();
        const accounts = await web3.eth.getAccounts();
        setAccounts(accounts);
        setContract(contract);
        if (accounts.length > 0) {
          setConnectionStatus(`Connected with: ${accounts[0]}`);
        }

        // Get contract admins
        const admins = await contract.methods.getAdmins().call();
        setContractAdmins(admins);

        // Listen for account changes
        window.ethereum.on('accountsChanged', async function (accounts) {
          setAccounts(accounts);
          if (accounts.length > 0) {
            setConnectionStatus(`Connected with: ${accounts[0]}`);
          } else {
            setConnectionStatus('No wallet connected');
          }
          window.location.reload();
        });

      } catch (error) {
        console.error("Failed to load web3, accounts, or contract. Check console for details.", error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchWinners = async () => {
      if (contract && accounts.length > 0) {
        try {
          const winners = await Promise.all(
            [0, 1, 2].map((index) => contract.methods.winners(index).call())
          );
          setWinners(winners);
        } catch (error) {
          console.error("Failed to fetch winners", error);
        }
      }
    };

    fetchWinners();
  }, [contract, accounts, isDrawn]);

  const fetchTotalAmount = async () => {
    if (contract) {
      const web3 = getWeb3(); // Initialize web3
      const totalAmount = await contract.methods.totalAmount().call();
      setTotalAmount(web3.utils.fromWei(totalAmount, 'ether'));
    }
  };

  const drawWinners = async () => {
    setIsLoading(true);
    if (contract && accounts.length > 0) {
      try {
        // Check if the current account is an admin
        const isAdmin = await contract.methods.admins(accounts[0]).call();
        if (!isAdmin) {
          alert("Only an admin can draw winners");
          return;
        }

        //draw winners only if the lottery is not drawn
        if (isDrawn) {
          alert("Winners have already been drawn");
          return;
        }

        const drawWinnersCall = contract.methods.drawWinners().send({ from: accounts[0] });

        drawWinnersCall.on('receipt', async (receipt) => {
          console.log(receipt);
          const winners = await Promise.all(
            [0, 1, 2].map((index) => contract.methods.winners(index).call())
          );
          setWinners(winners);
          console.log(winners);
          setIsDrawn(true);
        });

        await drawWinnersCall;
      } catch (error) {
        console.error("Failed to draw winners", error);
        alert("Failed to draw winners. Please check console for details.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const checkIfWinner = () => {
    if (!isDrawn) {
      alert("The winners have not been drawn yet.");
      return;
    }

    //admin can not be a winner
    if (contractAdmins.includes(accounts[0])) {
      alert("You are an admin, you can not be a winner.");
      return;
    }

    const winningItems = winners
      .map((winner, index) => winner === accounts[0] ? index : -1)
      .filter(index => index !== -1)
      .map(index => index === 0 ? 'IPhone 15' : index === 1 ? 'Tesla Model S' : 'Macbook Pro');

    if (winningItems.length > 0) {
      alert(`Congratulations! You won the following item(s): ${winningItems.join(', ')}`);
    } else {
      alert("Sorry, you did not win this time.");
    }
  };

  const resetLottery = async () => {
    setIsLoading(true);
    if (!contract) {
      alert("Contract is not loaded");
      return;
    }

    try {
      // Check if the current account is an admin
      const isAdmin = await contract.methods.admins(accounts[0]).call();
      if (!isAdmin) {
        alert("Only an admin can reset the lottery");
        return;
      }

      await contract.methods.resetLottery().send({ from: accounts[0] });
      alert("Lottery has been reset");
      // eslint-disable-next-line no-restricted-globals
      location.reload();
    } catch (error) {
      console.error("Failed to reset lottery", error);
      alert("Failed to reset lottery. Please check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawFunds = async () => {
    setIsLoading(true);
    try {
      if (contract && accounts.length > 0) {
        // Check if the current account is an admin
        const isAdmin = await contract.methods.admins(accounts[0]).call();
        if (!isAdmin) {
          alert("Only an admin can withdraw funds");
          return;
        }

        await contract.methods.withdraw().send({ from: accounts[0] });
        alert('Funds withdrawn successfully!');
      }
    } catch (error) {
      console.error("An error occurred while withdrawing funds:", error);
    } finally {
      setIsLoading(false);
      fetchTotalAmount();
    }
  };

  return (
    <div className='container'>
      <h1>Blockchain Lottery</h1>
      <h3>{connectionStatus}</h3>
      <h4>Contract Admins: {contractAdmins.join(', ')}</h4>
      <h2>Total Amount: {totalAmount} ETH</h2>

      <div className='itemsContainer'>
        <LotteryItem itemIndex={0} fetchTotalAmount={fetchTotalAmount} isDrawn={isDrawn} contractAdmins={contractAdmins} accounts={accounts} itemName={'IPhone 15'} imageSrc={phoneImage} contract={contract} />
        <LotteryItem itemIndex={1} fetchTotalAmount={fetchTotalAmount} isDrawn={isDrawn} contractAdmins={contractAdmins} accounts={accounts} itemName={'Tesla Model S'} imageSrc={carImage} contract={contract} />
        <LotteryItem itemIndex={2} fetchTotalAmount={fetchTotalAmount} isDrawn={isDrawn} contractAdmins={contractAdmins} accounts={accounts} itemName={'Macbook Pro'} imageSrc={macImage} contract={contract} />
      </div>
      <div className='btnContainer'>
        <button className='btn' onClick={checkIfWinner}>Check if Winner</button>
        <button className='btn' onClick={drawWinners} disabled={isLoading}>
          {isLoading ? "Drawing..." : "Draw Winners"}
        </button>
        <button className='btn' onClick={resetLottery} disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset Lottery"}
        </button>
        <button className='btn' onClick={withdrawFunds} disabled={isLoading}>
          {isLoading ? "Withdrawing..." : "Withdraw Funds"}
        </button>
      </div>
      <div className='winnersContainer'>
        <h1>Winners</h1>
        {!isDrawn && <p>Winners have not been drawn yet</p>}
        {isDrawn && winners.map((winner, index) => {
          return (
            <p key={index}>
              Winner of {index === 0 ? 'IPhone 15' : index === 1 ? 'Tesla Model S' : 'Macbook Pro'} : {winner}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default App;