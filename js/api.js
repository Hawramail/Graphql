async function gql(query, variables = {}) {
  const jwt = localStorage.getItem("jwt");

  if (!jwt) {
    window.location.replace("index.html");
    return;
  }

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },

    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status === 401) {
    localStorage.removeItem("jwt");
    window.location.replace("index.html");
    return;
  }

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(
      result.errors
        .map((error) => error.message)
        .join("\n")
    );
  }

  return result.data;
}


const PROFILE_QUERY = `
  query Profile {

    user {
      id
      login
      totalUp
      totalDown

      level: transactions(
        where: {
          type: { _eq: "level" }
        }
        order_by: {
          createdAt: desc
        }
      ) {
        amount
        path
        createdAt
      }

      transactions(
        where: {
          type: { _eq: "xp" }
        }
        order_by: {
          createdAt: asc
        }
      ) {
        amount
        type
        path
        createdAt
      }
    }

    projects: progress(
      where: {
        object: { type: { _eq: "project" } }
      }
      order_by: {
        updatedAt: desc
      }
    ) {
      path
      grade
      isDone

      object {
        name
        type
      }
    }

  }
`;


async function fetchAllData() {
  return gql(PROFILE_QUERY);
}