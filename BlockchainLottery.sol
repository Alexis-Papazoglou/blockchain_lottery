// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Lottery {
    uint256 public ticketPrice = 0.001 ether;

    address[] public adminsList;
    address[3] public winners;
    uint256 public totalAmount;

    struct Ticket {
        address owner;
        uint256 itemIndex;
        uint256 version;
    }

    struct Item {
        Ticket[] tickets;
    }

    mapping(uint256 => Item) private lotteryItems;
    uint256 private itemCount = 3;

    mapping(address => Ticket[]) private ticketsByOwner;

    bool public isDrawn = false;

    uint256 public version = 0;

    mapping(address => bool) public admins;

    event LotteryDraw(address indexed winner, uint256 indexed itemIndex);

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only an admin can perform this action");
        _;
    }

    constructor() {
        admins[msg.sender] = true;
        adminsList.push(msg.sender);
        admins[0x153dfef4355E823dCB0FCc76Efe942BefCa86477] = true;
        adminsList.push(0x153dfef4355E823dCB0FCc76Efe942BefCa86477);
    }

    function getAdmins() public view returns (address[] memory) {
        return adminsList;
    }

    function buyTicket(uint256 itemIndex) external payable {
        require(!isDrawn, "Winners are already drawn");
        require(!admins[msg.sender], "Admins cannot bid on items");

        require(msg.value == ticketPrice, "Incorrect ticket price");
        require(itemIndex < itemCount, "Invalid item index");

        Ticket memory newTicket = Ticket({
            owner: msg.sender,
            itemIndex: itemIndex,
            version: version
        });
        lotteryItems[itemIndex].tickets.push(newTicket);
        ticketsByOwner[msg.sender].push(newTicket);
        totalAmount += msg.value;
    }

    function getLotteryItems(uint256 itemIndex)
        external
        view
        returns (Ticket[] memory)
    {
        require(itemIndex < itemCount, "Invalid item index");

        Ticket[] storage tickets = lotteryItems[itemIndex].tickets;

        uint256 ticketCount = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].version == version) {
                ticketCount++;
            }
        }

        Ticket[] memory currentTickets = new Ticket[](ticketCount);

        uint256 j = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].version == version) {
                currentTickets[j] = tickets[i];
                j++;
            }
        }

        return currentTickets;
    }

    function getLotteryTicketsForItem(uint256 itemIndex)
        external
        view
        returns (address[] memory, uint256[] memory)
    {
        require(itemIndex < itemCount, "Invalid item index");

        Ticket[] storage tickets = lotteryItems[itemIndex].tickets;

        uint256 ticketCount = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].version == version) {
                ticketCount++;
            }
        }

        address[] memory players = new address[](ticketCount);
        uint256[] memory ticketCounts = new uint256[](ticketCount);

        uint256 j = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].version == version) {
                players[j] = tickets[i].owner;
                ticketCounts[j] = tickets[i].itemIndex;
                j++;
            }
        }

        return (players, ticketCounts);
    }

    function drawWinners() external onlyAdmin returns (address[3] memory) {
        require(!isDrawn, "Winners have already been drawn");
        isDrawn = true;

        for (uint256 i = 0; i < itemCount; i++) {
            if (lotteryItems[i].tickets.length > 0) {
                uint256 winnerIndex = random(i, lotteryItems[i].tickets.length);

                if (lotteryItems[i].tickets[winnerIndex].version == version) {
                    winners[i] = lotteryItems[i].tickets[winnerIndex].owner;

                    emit LotteryDraw(winners[i], i);
                } else {
                    winners[i] = address(0);
                }
            } else {
                winners[i] = address(0);
            }
        }

        return winners;
    }

    function getTicketsForOwner(address owner)
        external
        view
        returns (Ticket[] memory)
    {
        Ticket[] storage tickets = ticketsByOwner[owner];

        uint256 ticketCount = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].version == version) {
                ticketCount++;
            }
        }

        Ticket[] memory currentTickets = new Ticket[](ticketCount);

        uint256 j = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].version == version) {
                currentTickets[j] = tickets[i];
                j++;
            }
        }

        return currentTickets;
    }

    function random(uint256 seed, uint256 max) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(block.difficulty, block.timestamp, seed)
                )
            ) % max;
    }

    function resetLottery() external onlyAdmin {
        isDrawn = false;
        version = 0; // Reset the version to 0

        // Clear existing tickets for all items
        for (uint256 i = 0; i < itemCount; i++) {
            delete lotteryItems[i].tickets;
        }

        totalAmount = 0;

        // Reset winners
        for (uint256 i = 0; i < winners.length; i++) {
            winners[i] = address(0);
        }
    }

    function withdraw() external onlyAdmin {
        payable(msg.sender).transfer(address(this).balance);
    }
}
