use napi::bindgen_prelude::Result;

pub(crate) fn card_id_generator() -> impl FnMut() -> Result<i64> {
  let mut next_id = 0i64;
  move || {
    if next_id > 9_007_199_254_740_991 {
      return Err(napi::Error::from_reason(
        "Too many card IDs for JavaScript safe integers",
      ));
    }
    let id = next_id;
    next_id += 1;
    Ok(id)
  }
}
