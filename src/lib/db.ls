require! {
  'mongojs': mongo
}

collections =
   * \mentions
   * \receivedPms
   * \acknowledgedPms
   * \bailiffCases
   * \bailiffEvidence
   * \postman

db-lib = (@name) ~>
  db = mongo @name, collections

  ## gets an element from the database
  get-element-from-db = (el, collection, cb = id) ~~>
     db[collection].findOne name: el.name , (err, doc) ->
        cb err, doc

  ## returns true if `el` is in `collection` of the database, otherwise false
  check-if-element-in-db = (el, collection, cb = id) ~~>
     db[collection].find name: el.name .limit 1 .count (err, count) ->
        if err => cb err
        ret = count != 0
        cb ret

  ## takes an array and inserts each element into `db-collection`, unless that element is already in (based on a .name attribute)
  ## useful for putting listings (by using simplify-listing) into a db
  commit-array-to-db = (array, collection, cb = id) ~~>
     arr = []
     if array.length => for let element, i in array
        (exists) <- check-if-element-in-db element, collection
        if exists => return

        db[collection].insert element
        say "inserted #{element.name} to database #collection"
        arr.push element
        if i == array.length - 1 => return cb arr
     else
        cb arr

  ## public methods
  get-element-from-db: get-element-from-db
  check-if-element-in-db: check-if-element-in-db
  commit-array-to-db: commit-array-to-db

module.exports = db-lib
