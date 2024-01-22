/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { getWeb3 } from './web3';
import './LotteryItem.css';

function LotteryItem({ itemIndex, accounts, contract, imageSrc, itemName, contractAdmins, isDrawn, fetchTotalAmount}) {
  const [ticketCount, setTicketCount] = useState(0);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  useEffect(() => {
    const fetchTicketCount = async () => {
      if (contract && accounts.length > 0) {
        const tickets = await contract.methods.getLotteryTicketsForItem(itemIndex).call({ from: accounts[0] });
        setTicketCount(tickets[0].length); // Assuming tickets[0] contains the addresses of ticket owners
      }
    };
    fetchTicketCount();
  }, [contract, accounts, itemIndex]);

  const buyTicket = async () => {
    setIsLoadingTicket(true);
    if (contract && accounts.length > 0) {
      try {
        // Prevent contract owner from buying a ticket
        if (contractAdmins.includes(accounts[0])) {
          alert("Admins cannot buy a ticket");
          return;
        }

        // Prevent buying a ticket if the lottery is drawn
        if (isDrawn) {
          alert("The lottery is already drawn");
          return;
        }

        const web3 = getWeb3();
        const value = web3.utils.toWei('0.001', 'ether');
        await contract.methods.buyTicket(itemIndex).send({ from: accounts[0], value });
        alert(`Ticket bought for ${itemName}!`);

        // Refresh ticket count after buying a ticket
        const tickets = await contract.methods.getLotteryTicketsForItem(itemIndex).call({ from: accounts[0] });
        setTicketCount(tickets[0].length);
        fetchTotalAmount();
      } catch (error) {
        console.error("Failed to buy a ticket", error);
        if (error.code === 4001) { // User rejected transaction
          alert("Transaction rejected");
        } else if (error.message.includes("insufficient funds")) { // Insufficient funds
          alert("Insufficient funds for this transaction");
        } else { // Other errors
          alert(`Failed to buy a ticket.${error.message}`);
        }
      }
      finally {
        setIsLoadingTicket(false);
      }
    }
  };

  return (
    <div className='itemContainer'>
      <h3>{itemName}</h3>
      <img className='img' src={imageSrc} alt={`Item ${itemIndex}`} />
      <p>Tickets bought: {ticketCount}</p>
      <button className='buyBtn' onClick={buyTicket} disabled={isLoadingTicket}>
        {isLoadingTicket ? "Buying..." : "Buy Ticket"}
      </button>
    </div>
  );
}

export default LotteryItem;