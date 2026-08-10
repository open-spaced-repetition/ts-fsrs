use std::rc::Rc;

use napi::bindgen_prelude::{
  Either, Env, Function, FunctionRef, JsObjectValue, JsValue, Object, PromiseRaw, ReadableStream,
  Result, Uint8Array,
};

use crate::{convert::convert_csv_bytes, timezone::TimezoneOffset};

type ReadFunction<'env> = FunctionRef<(), PromiseRaw<'env, Object<'env>>>;
type ReleaseLockFunction = FunctionRef<(), ()>;

fn bind_stream_reader<'env>(
  stream: &ReadableStream<'env, Uint8Array>,
) -> Result<(ReadFunction<'env>, ReleaseLockFunction)> {
  let get_reader: Function<(), Object<'env>> = stream.get_named_property_unchecked("getReader")?;
  let reader = get_reader.apply(stream.to_unknown(), ())?;
  let read: Function<(), PromiseRaw<'env, Object<'env>>> =
    reader.get_named_property_unchecked("read")?;
  let release_lock: Function<(), ()> = reader.get_named_property_unchecked("releaseLock")?;
  Ok((
    read.bind(reader)?.create_ref()?,
    release_lock.bind(reader)?.create_ref()?,
  ))
}

fn read_csv_stream<'env>(
  env: &Env,
  read: ReadFunction<'env>,
  mut data: Vec<u8>,
  next_day_starts_at: i64,
  timezone_offset: TimezoneOffset,
) -> Result<PromiseRaw<'env, Object<'env>>> {
  let chained = read.borrow_back(env)?.call(())?.then(move |context| {
    if context.value.get_named_property("done")? {
      return Ok(Either::A(convert_csv_bytes(
        &data,
        next_day_starts_at,
        &timezone_offset,
      )?));
    }

    let chunk: Uint8Array = context.value.get_named_property("value")?;
    data.extend_from_slice(chunk.as_ref());

    Ok(Either::B(read_csv_stream(
      &context.env,
      read,
      data,
      next_day_starts_at,
      timezone_offset,
    )?))
  })?;

  // Returning the next read Promise lets JavaScript flatten the chain until the final array.
  Ok(PromiseRaw::new(env.raw(), chained.raw()))
}

pub(crate) fn convert_csv_stream<'env>(
  env: &'env Env,
  stream: ReadableStream<'env, Uint8Array>,
  next_day_starts_at: i64,
  timezone_offset: TimezoneOffset,
) -> Result<PromiseRaw<'env, Object<'env>>> {
  if stream.locked()? {
    return PromiseRaw::reject(env, napi::Error::from_reason("ReadableStream is locked"));
  }
  let (read, release_lock) = match bind_stream_reader(&stream) {
    Ok(reader) => reader,
    Err(error) => return PromiseRaw::reject(env, error),
  };
  let release_lock = Rc::new(release_lock);
  // ponytail: buffers in Rust because conversion must sort every revlog; add an async CSV parser
  // only if this extra raw buffer becomes a measured memory bottleneck.
  let mut promise =
    match read_csv_stream(env, read, Vec::new(), next_day_starts_at, timezone_offset) {
      Ok(promise) => promise,
      Err(error) => {
        release_lock.borrow_back(env)?.call(())?;
        return PromiseRaw::reject(env, error);
      }
    };
  let release_lock_on_settle = Rc::clone(&release_lock);
  match promise.finally(move |env| release_lock_on_settle.borrow_back(&env)?.call(())) {
    Ok(promise) => Ok(promise),
    Err(error) => {
      release_lock.borrow_back(env)?.call(())?;
      PromiseRaw::reject(env, error)
    }
  }
}
