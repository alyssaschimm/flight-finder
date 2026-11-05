Today, I have 60 minutes to create an application that helps users find the most cost-efficient flight by comparing airlines, credit card points, airline points, and cash value.

Problem: Users have to navigate through multiple different airline websites, booking websites, and credit card websites to compare flight options and their costs. Additionally, it is difficult for users to compare whether using their points to book is a better or worse value than paying cash for flights. We want to make a really easy interface for users to quickly scan this data and have a rank of their options and understand the monetary value of using their points vs. paying cash.

Goal: Users can efficiently scan all flight options and their associated costs. Users can select a flight and be redirected to the airline or credit card page to book.

Constraints:
- We only have 60 minutes to build this
- Mock data is fine for the prototype, but consider which APIs we would call to make this real data.

Functional Context:
- Users can input date, time, and other common flight information to filter for flights.
- Tool should surface flights from all available airlines.
- When a user clicks search after inputting their data, that is when they are presented with the cost-ranked options.
- There should be a clear evaluation of points to dollars (i.e. users should not have to Google "How many dollars is 30,000 united points worth?")
- If data is not available do not present any false data, send an error.
- If a user selects or hovers over a flight, it should display more details, such as economy classes, flight numbers, etc.
- If a user wants to proceed with booking the flight at a certain cost and they click on "Book" they should be redirected to the host website to book. The host website may be an Airline Website or a Credit Card Website. For now, do not use 3rd party booking options.

Visual Context:
- The look and feel of this Web Application should be similar to Google Flights or United. I want it to feel as close to a pre-existing airline booking experience as possible.
- Keep the color scheme White & Dark Blue. 
- Do not over-engineer the website. I want it to feel approachable. I also want it to feel real.
- The first page should allow users to input their flight information for search. The next page should display options. And the third page when they drill into a flight should show more details and have the link to be redirected to book.

Data Context:
- Develop a mock dataset for the prototype. If we have time, we can explore hooking up to APIs.
- The mock dataset should include real airlines, flights that are likely to exist, and images for each associated airline and credit card.

APIs and Content:
- Please verify what API you are using for text generation. I want the copy to be professional.
- Please use an API to pull stock photos if necessary. Confirm with me which API you will be using.

Questions:
- If you have design or product questions, please collaborate with me as you build. I want to ensure the look and feel are as I expect as we go.
- If time, let's consider hooking up APIs on the backend, but do not do so until you are prompted.
- If you have questions about the execution or states, please confirm with me before building.